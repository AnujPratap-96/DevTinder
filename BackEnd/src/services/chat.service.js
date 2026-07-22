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

const parsePagination = ({ page = 1, limit = 20 }) => {
  const numericPage = Math.max(parseInt(page, 10) || 1, 1);
  const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (numericPage - 1) * numericLimit;
  return { page: numericPage, limit: numericLimit, skip };
};

export const getChatWithUser = async ({ userId, targetUserId, pagination }) => {
  if (!userId || !targetUserId) {
    throw new ValidationError("userId and targetUserId are required");
  }

  await ensureConnection(userId, targetUserId);

  const chat = await Chat.findOrCreateByParticipants(userId, targetUserId);
  const { limit } = parsePagination(pagination ?? {});
  const messages = await Message.find({ matchId: chat._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return {
    chat: {
      matchId: chat._id,
      participants: chat.participants,
      lastMessageAt: chat.lastMessageAt,
    },
    messages: messages.reverse(),
  };
};

export const listChatMessages = async ({ matchId, userId, pagination }) => {
  await ensureParticipant(matchId, userId);
  const { limit, skip, page } = parsePagination(pagination ?? {});

  const [messages, total] = await Promise.all([
    Message.find({ matchId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments({ matchId }),
  ]);

  return {
    page,
    limit,
    total,
    hasMore: skip + messages.length < total,
    messages: messages.reverse(),
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
