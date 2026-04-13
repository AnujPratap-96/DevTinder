const socket = require("socket.io");
const { Chat } = require("../models/chat");
const { Message } = require("../models/message");
const ConnectionRequest = require("../models/connectionRequest");
const Notification = require("../models/notification");
const User = require("../models/user");

const activeUsers = new Map(); // userId -> Set<socketId>
const offlineTimeouts = new Map(); // userId -> NodeJS.Timeout
const rateTracker = new Map(); // userId -> number[] timestamps

const RATE_LIMIT_WINDOW_MS = 2000;
const RATE_LIMIT_MAX_MESSAGES = 8;
const OFFLINE_DELAY_MS = 5000;

const registerSocketForUser = (userId, socket) => {
  if (!userId) return;
  const userKey = userId.toString();
  
  // Clear any pending offline marking
  if (offlineTimeouts.has(userKey)) {
    clearTimeout(offlineTimeouts.get(userKey));
    offlineTimeouts.delete(userKey);
  }

  const sockets = activeUsers.get(userKey) ?? new Set();
  sockets.add(socket.id);
  activeUsers.set(userKey, sockets);

  if (sockets.size === 1) {
    User.findByIdAndUpdate(userKey, { $set: { isOnline: true } }).catch(() => {});
  }
  socket.data.userId = userKey;
};

const unregisterSocketForUser = (socketInstance) => {
  const { userId } = socketInstance.data;
  if (!userId) return;
  const sockets = activeUsers.get(userId);
  if (!sockets) return;
  
  sockets.delete(socketInstance.id);
  
  if (sockets.size === 0) {
    // Start delay before marking offline
    const timeout = setTimeout(async () => {
      // Re-verify after delay
      const currentSockets = activeUsers.get(userId);
      if (!currentSockets || currentSockets.size === 0) {
        activeUsers.delete(userId);
        offlineTimeouts.delete(userId);
        await User.findByIdAndUpdate(userId, {
          $set: { isOnline: false, lastSeenAt: new Date() },
        }).catch(() => {});
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
  delivered: doc.delivered,
  seen: doc.seen,
  deliveredAt: doc.deliveredAt,
  seenAt: doc.seenAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  metadata: doc.metadata ?? {},
});

const markMessagesDeliveredForUser = async ({ userId, socket, matchId }) => {
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

  socket.emit("messages:delivered", pending.map(formatMessage));
};

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socketInstance) => {
    socketInstance.on("session:register", async ({ userId }) => {
      if (!userId) return;
      registerSocketForUser(userId, socketInstance);
      await User.findByIdAndUpdate(userId, {
        $set: { isOnline: true },
      }).catch(() => {});
      await markMessagesDeliveredForUser({ userId, socket: socketInstance });
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

        // Reset unread count for this user
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
          socket: socketInstance,
          matchId: chat._id,
        });
      } catch (error) {
        socketInstance.emit("chat:error", { message: error.message });
      }
    });

    socketInstance.on(
      "sendMessage",
      async ({ userId, targetUserId, matchId, message, messageType = "text", clientMessageId, metadata = {} }) => {
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
            clientMessageId,
            metadata,
          });

          // Increment unread count for receiver
          const unreadIncKey = `unreadCounts.${receiverId}`;
          const updatedChat = await Chat.findByIdAndUpdate(
            chat._id,
            { 
              $set: { lastMessageAt: new Date() },
              $inc: { [unreadIncKey]: 1 }
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
            
            // Emit unread update to receiver
            receiverSockets.forEach(sid => {
              io.to(sid).emit("unread:update", {
                matchId: chat._id,
                unreadCounts: updatedChat.unreadCounts
              });
            });
          }

          await Notification.create({
            userId: receiverId,
            type: "message.new",
            payload: {
              matchId: chat._id,
              senderId: userId,
              message: formatted.message,
              clientMessageId,
            },
          });

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
        
        // Reset unread count on seen
        const unreadResetKey = `unreadCounts.${userId}`;
        const updatedChat = await Chat.findByIdAndUpdate(
          matchId,
          { $set: { [unreadResetKey]: 0 } },
          { new: true }
        );

        io.to(matchId.toString()).emit("messages:seen", { userId, matchId });
        socketInstance.emit("unread:update", {
          matchId,
          unreadCounts: updatedChat.unreadCounts
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

module.exports = { initializeSocket };
