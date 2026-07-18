import { Server } from "socket.io";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import ConnectionRequest from "../models/connectionRequest.js";
import User from "../models/user.model.js";
import { createNotification, formatNotification } from "../repositories/notification.repository.js";
import config from "../config/env.js";
import logger from "./logger.js";

const activeUsers = new Map();
const offlineTimeouts = new Map();
const rateTracker = new Map();

const RATE_LIMIT_WINDOW_MS = 2000;
const RATE_LIMIT_MAX_MESSAGES = 8;
const OFFLINE_DELAY_MS = 5000;

let ioInstance = null;

const registerSocketForUser = (userId, socketInstance) => {
  if (!userId) return;
  const userKey = userId.toString();

  if (offlineTimeouts.has(userKey)) {
    clearTimeout(offlineTimeouts.get(userKey));
    offlineTimeouts.delete(userKey);
  }

  const sockets = activeUsers.get(userKey) ?? new Set();
  sockets.add(socketInstance.id);
  activeUsers.set(userKey, sockets);

  if (sockets.size === 1) {
    User.findByIdAndUpdate(userKey, { $set: { isOnline: true } }).catch((error) =>
      logger.warn("Failed to mark user online", error)
    );
  }
  socketInstance.data.userId = userKey;
};

const unregisterSocketForUser = (socketInstance) => {
  const { userId } = socketInstance.data;
  if (!userId) return;
  const sockets = activeUsers.get(userId);
  if (!sockets) return;

  sockets.delete(socketInstance.id);

  if (sockets.size === 0) {
    const timeout = setTimeout(async () => {
      const currentSockets = activeUsers.get(userId);
      if (!currentSockets || currentSockets.size === 0) {
        activeUsers.delete(userId);
        offlineTimeouts.delete(userId);
        await User.findByIdAndUpdate(userId, {
          $set: { isOnline: false, lastSeenAt: new Date() },
        }).catch((error) => logger.warn("Failed to mark user offline", error));
      }
    }, OFFLINE_DELAY_MS);

    offlineTimeouts.set(userId, timeout);
  }
};

const isRateLimited = (userId) => {
  if (!userId) return true;
  const now = Date.now();
  const timestamps = rateTracker.get(userId) ?? [];
  const recent = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_MESSAGES) {
    rateTracker.set(userId, recent);
    return true;
  }
  recent.push(now);
  rateTracker.set(userId, recent);
  return false;
};

const ensureConnection = async (userId, targetUserId) => {
  const isConnection = await ConnectionRequest.findOne({
    $or: [
      { fromUserId: userId, toUserId: targetUserId, status: "accepted" },
      { toUserId: userId, fromUserId: targetUserId, status: "accepted" },
    ],
  }).lean();
  if (!isConnection) {
    const error = new Error("You are not connected with this user");
    error.code = "NOT_CONNECTED";
    throw error;
  }
};

const formatMessage = (doc) => ({
  _id: doc._id,
  matchId: doc.matchId,
  senderId: doc.senderId,
  receiverId: doc.receiverId,
  clientMessageId: doc.clientMessageId,
  message: doc.message,
  messageType: doc.messageType,
  isEncrypted: doc.isEncrypted ?? false,
  delivered: doc.delivered,
  seen: doc.seen,
  deliveredAt: doc.deliveredAt,
  seenAt: doc.seenAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  metadata: doc.metadata ?? {},
});

const markMessagesDeliveredForUser = async ({ userId, socketInstance, matchId }) => {
  const query = { receiverId: userId, delivered: false };
  if (matchId) {
    query.matchId = matchId;
  }
  const pending = await Message.find(query).sort({ createdAt: 1 });
  if (!pending.length) return;

  const ids = pending.map((msg) => msg._id);
  await Message.updateMany(
    { _id: { $in: ids } },
    { $set: { delivered: true, deliveredAt: new Date() } }
  );

  socketInstance.emit("messages:delivered", pending.map(formatMessage));
};

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: config.cors.origins,
      credentials: config.cors.credentials,
    },
  });
  ioInstance = io;

  io.on("connection", (socketInstance) => {
    socketInstance.on("session:register", async ({ userId }) => {
      if (!userId) return;
      registerSocketForUser(userId, socketInstance);
      await User.findByIdAndUpdate(userId, {
        $set: { isOnline: true },
      }).catch((error) => logger.warn("Failed to set user online", error));
      await markMessagesDeliveredForUser({ userId, socketInstance });
    });

    socketInstance.on("joinChat", async ({ userId, targetUserId, matchId }) => {
      try {
        if (!userId) throw new Error("userId is required");
        registerSocketForUser(userId, socketInstance);

        let chat;
        if (matchId) {
          chat = await Chat.findById(matchId);
          if (!chat) throw new Error("Conversation not found");
        } else {
          if (!targetUserId) throw new Error("targetUserId is required when matchId is not provided");
          await ensureConnection(userId, targetUserId);
          chat = await Chat.findOrCreateByParticipants(userId, targetUserId);
        }

        const participantIds = chat.participants.map((p) => p.toString());
        if (!participantIds.includes(userId.toString())) {
          throw new Error("You are not part of this conversation");
        }

        const roomId = chat.getRoomId();
        socketInstance.join(roomId);

        const unreadResetKey = `unreadCounts.${userId}`;
        const updatedChat = await Chat.findByIdAndUpdate(
          chat._id,
          { $set: { [unreadResetKey]: 0 } },
          { new: true }
        );

        socketInstance.emit("chat:joined", {
          matchId: chat._id,
          participants: chat.participants,
          unreadCounts: updatedChat.unreadCounts,
        });

        await markMessagesDeliveredForUser({
          userId,
          socketInstance,
          matchId: chat._id,
        });
      } catch (error) {
        socketInstance.emit("chat:error", { message: error.message });
      }
    });

    socketInstance.on(
      "sendMessage",
      async ({ userId, targetUserId, matchId, message, messageType = "text", clientMessageId, isEncrypted = true, metadata = {} }) => {
        try {
          if (!userId) throw new Error("userId is required");
          if (!clientMessageId) throw new Error("clientMessageId is required");
          if (!message?.trim()) throw new Error("message is required");

          registerSocketForUser(userId, socketInstance);

          if (isRateLimited(userId.toString())) {
            socketInstance.emit("chat:error", { message: "You are sending messages too fast" });
            return;
          }

          const duplicate = await Message.findOne({ clientMessageId }).lean();
          if (duplicate) {
            socketInstance.emit("message:ack", formatMessage(duplicate));
            return;
          }

          let chat;
          let receiverId = targetUserId;

          if (matchId) {
            chat = await Chat.findById(matchId);
            if (!chat) throw new Error("Conversation not found");
            const participants = chat.participants.map((p) => p.toString());
            if (!participants.includes(userId.toString())) {
              throw new Error("You are not part of this conversation");
            }
            receiverId = participants.find((id) => id !== userId.toString());
          } else {
            if (!targetUserId) throw new Error("targetUserId is required when matchId is not provided");
            await ensureConnection(userId, targetUserId);
            chat = await Chat.findOrCreateByParticipants(userId, targetUserId);
          }

          if (!receiverId) {
            throw new Error("receiver could not be determined");
          }

          const newMessage = await Message.create({
            matchId: chat._id,
            senderId: userId,
            receiverId,
            message: message.trim(),
            messageType,
            isEncrypted: Boolean(isEncrypted),
            clientMessageId,
            metadata,
          });

          const unreadIncKey = `unreadCounts.${receiverId}`;
          const updatedChat = await Chat.findByIdAndUpdate(
            chat._id,
            {
              $set: { lastMessageAt: new Date() },
              $inc: { [unreadIncKey]: 1 },
            },
            { new: true }
          );

          const formatted = formatMessage(newMessage);

          const receiverSockets = activeUsers.get(receiverId.toString());
          if (receiverSockets?.size) {
            await Message.updateOne(
              { _id: newMessage._id },
              { $set: { delivered: true, deliveredAt: new Date() } }
            );
            formatted.delivered = true;
            formatted.deliveredAt = new Date();

            receiverSockets.forEach((sid) => {
              io.to(sid).emit("unread:update", {
                matchId: chat._id,
                unreadCounts: updatedChat.unreadCounts,
              });
            });
          }

          const notificationDoc = await createNotification({
            userId: receiverId,
            type: "message.new",
            // Deliberately omit the message body: it is end-to-end encrypted and
            // the server must never persist plaintext. No internal ids are sent
            // either — the client shows a generic "New message" preview.
            payload: {},
          });
          emitToUser(receiverId, "notification:new", formatNotification(notificationDoc));

          io.to(chat.getRoomId()).emit("message:created", formatted);
          socketInstance.emit("message:ack", formatted);
        } catch (error) {
          socketInstance.emit("chat:error", { message: error.message });
        }
      }
    );

    socketInstance.on("message:seen", async ({ userId, matchId }) => {
      try {
        if (!userId || !matchId) return;

        await Message.markAsSeen({ matchId, receiverId: userId });

        const unreadResetKey = `unreadCounts.${userId}`;
        const updatedChat = await Chat.findByIdAndUpdate(
          matchId,
          { $set: { [unreadResetKey]: 0 } },
          { new: true }
        );

        io.to(matchId.toString()).emit("messages:seen", { userId, matchId });
        socketInstance.emit("unread:update", {
          matchId,
          unreadCounts: updatedChat.unreadCounts,
        });
      } catch (error) {
        socketInstance.emit("chat:error", { message: error.message });
      }
    });

    socketInstance.on("typing:start", ({ matchId, userId }) => {
      if (!matchId || !userId) return;
      socketInstance.to(matchId.toString()).emit("typing:start", { matchId, userId });
    });

    socketInstance.on("typing:stop", ({ matchId, userId }) => {
      if (!matchId || !userId) return;
      socketInstance.to(matchId.toString()).emit("typing:stop", { matchId, userId });
    });

    socketInstance.on("disconnect", () => {
      unregisterSocketForUser(socketInstance);
    });
  });
};

const getIO = () => ioInstance;

/**
 * Emit an event to every connected socket for a given user.
 * Uses the in-memory activeUsers registry (socket ids per user).
 * Returns true if at least one socket received the event.
 */
const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return false;
  const userKey = userId.toString();
  const sockets = activeUsers.get(userKey);
  if (!sockets || sockets.size === 0) return false;
  sockets.forEach((socketId) => {
    ioInstance.to(socketId).emit(event, payload);
  });
  return true;
};

export { initializeSocket, getIO, emitToUser };

export default {
  initializeSocket,
  getIO,
  emitToUser,
};
