import Chat from "../models/chat.js";
import Message from "../models/message.js";
import ConnectionRequest from "../models/connectionRequest.js";
import { AppError, ValidationError, NotFoundError } from "../errors/index.js";

const ensureConnection = async (userId, targetUserId) => {
  const isConnection = await ConnectionRequest.findOne({
    $or: [
      { fromUserId: userId, toUserId: targetUserId, status: "accepted" },
      { toUserId: userId, fromUserId: targetUserId, status: "accepted" },
    ],
  }).lean();
  if (!isConnection) {
    throw new AppError({ message: "You are not connected with this user", statusCode: 403 });
  }
};

const ensureParticipant = async (matchId, userId) => {
  const chat = await Chat.findById(matchId).lean();
  if (!chat) {
    throw new NotFoundError("Conversation");
  }
  const isParticipant = chat.participants.some((participant) => participant.toString() === userId.toString());
  if (!isParticipant) {
    throw new AppError({ message: "You are not part of this conversation", statusCode: 403 });
  }
  return chat;
};

export const getChatWithUser = async ({ userId, targetUserId, limit = 20, cursor = null }) => {
  if (!userId || !targetUserId) {
    throw new ValidationError("userId and targetUserId are required");
  }

  await ensureConnection(userId, targetUserId);

  const chat = await Chat.findOrCreateByParticipants(userId, targetUserId);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const filter = { matchId: chat._id };
  if (cursor) filter._id = { $lt: cursor };
  const docs = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(pageSize + 1)
    .lean();
  const hasMore = docs.length > pageSize;
  const messages = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? messages[messages.length - 1]._id : null;

  return {
    chat: {
      matchId: chat._id,
      participants: chat.participants,
      lastMessageAt: chat.lastMessageAt,
    },
    messages: messages.reverse(),
    nextCursor,
    hasMore,
  };
};

export const listChatMessages = async ({ matchId, userId, limit = 20, cursor = null }) => {
  await ensureParticipant(matchId, userId);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const filter = { matchId };
  if (cursor) filter._id = { $lt: cursor };
  const docs = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(pageSize + 1)
    .lean();
  const hasMore = docs.length > pageSize;
  const messages = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? messages[messages.length - 1]._id : null;

  return {
    messages: messages.reverse(),
    nextCursor,
    hasMore,
  };
};

export const markMessagesSeenService = async ({ matchId, userId }) => {
  if (!matchId) {
    throw new ValidationError("matchId is required");
  }

  await ensureParticipant(matchId, userId);

  const result = await Message.markAsSeen({ matchId, receiverId: userId });

  const unreadResetKey = `unreadCounts.${userId}`;
  await Chat.findByIdAndUpdate(matchId, { $set: { [unreadResetKey]: 0 } });

  return { updated: result.modifiedCount ?? result.nModified ?? 0 };
};

export const deleteMessageService = async ({ messageId, userId }) => {
  if (!messageId) {
    throw new ValidationError("messageId is required");
  }

  const message = await Message.findById(messageId);
  if (!message) {
    throw new NotFoundError("Message");
  }

  if (message.senderId.toString() !== userId.toString()) {
    throw new AppError({ message: "You can only delete your own messages", statusCode: 403 });
  }

  await Message.findByIdAndDelete(messageId);
  return message;
};

export default {
  getChatWithUser,
  listChatMessages,
  markMessagesSeenService,
  deleteMessageService,
};
