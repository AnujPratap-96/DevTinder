import { randomUUID } from "crypto";
import { AppError, ValidationError, NotFoundError } from "../errors/index.js";
import uploadImageCloudinary from "../utils/cloudinary.js";
import { getIO } from "../utils/socket.js";
import * as chatRepo from "../repositories/chat.repository.js";

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

export const uploadChatImage = async ({ userId, targetUserId, matchId, file }) => {
  if (!file) throw new ValidationError("Image file is required");
  if (!userId || !targetUserId) throw new ValidationError("userId and targetUserId are required");

  const isConnected = await chatRepo.ensureConnection(userId, targetUserId);
  if (!isConnected) {
    throw new AppError({ message: "You are not connected with this user", statusCode: 403 });
  }

  const chat = matchId
    ? await chatRepo.findChatById(matchId)
    : await chatRepo.findOrCreateChat(userId, targetUserId);
  if (!chat) throw new NotFoundError("Conversation");

  const uploadResult = await uploadImageCloudinary(file);
  if (!uploadResult?.secure_url) {
    throw new AppError({ message: uploadResult?.message || "Image upload failed", statusCode: 500 });
  }

  const msg = await chatRepo.createMessage({
    matchId: chat._id,
    senderId: userId,
    receiverId: targetUserId,
    clientMessageId: `img-${randomUUID()}`,
    message: uploadResult.secure_url,
    isEncrypted: false,
    messageType: "image",
    delivered: true,
    deliveredAt: new Date(),
    metadata: { width: uploadResult.width, height: uploadResult.height },
  });

  await chatRepo.updateChatLastMessage(chat._id, msg.createdAt);

  const populated = await chatRepo.populateMessageSender(msg._id);

  const io = getIO();
  if (io) {
    io.to(chat._id.toString()).emit("message:created", populated);
  }

  return populated;
};

export default {
  getChatWithUser,
  listChatMessages,
  markMessagesSeenService,
  deleteMessageService,
  uploadChatImage,
};
