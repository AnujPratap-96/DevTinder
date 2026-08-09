import { randomUUID } from "crypto";
import { AppError, ValidationError, NotFoundError } from "../errors/index.js";
import uploadImageCloudinary from "../utils/cloudinary.js";
import { getIO } from "../utils/socket.js";
import * as chatRepo from "../repositories/chat.repository.js";

export const getChatWithUser = async ({ userId, targetUserId, limit = 20, cursor = null }) => {
  if (!userId || !targetUserId) {
    throw new ValidationError("userId and targetUserId are required");
  }

  const isConnected = await chatRepo.ensureConnection(userId, targetUserId);
  if (!isConnected) {
    throw new AppError({ message: "You are not connected with this user", statusCode: 403 });
  }

  const chat = await chatRepo.findOrCreateChat(userId, targetUserId);
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const filter = { matchId: chat._id };
  if (cursor) filter._id = { $lt: cursor };
  const docs = await chatRepo.findMessages(filter, { limit: pageSize, sort: { createdAt: -1 } });
  const hasMore = docs.length > pageSize;
  const messages = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? messages[messages.length - 1]._id : null;

  const chatWithPin = await chatRepo.populatePinnedMessage(chat._id);

  return {
    chat: {
      matchId: chat._id,
      participants: chat.participants,
      lastMessageAt: chat.lastMessageAt,
      pinnedMessage: chatWithPin.pinnedMessageId ?? null,
    },
    messages: messages.reverse(),
    nextCursor,
    hasMore,
  };
};

export const listChatMessages = async ({ matchId, userId, limit = 20, cursor = null }) => {
  const chat = await chatRepo.findChatByIdLean(matchId);
  if (!chat) {
    throw new NotFoundError("Conversation");
  }
  const isParticipant = chat.participants.some((participant) => participant.toString() === userId.toString());
  if (!isParticipant) {
    throw new AppError({ message: "You are not part of this conversation", statusCode: 403 });
  }

  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const filter = { matchId };
  if (cursor) filter._id = { $lt: cursor };
  const docs = await chatRepo.findMessages(filter, { limit: pageSize, sort: { createdAt: -1 } });
  const hasMore = docs.length > pageSize;
  const messages = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? messages[messages.length - 1]._id : null;

  const chatWithPin = await chatRepo.populatePinnedMessage(matchId);

  return {
    messages: messages.reverse(),
    nextCursor,
    hasMore,
    pinnedMessage: chatWithPin.pinnedMessageId ?? null,
  };
};

export const markMessagesSeenService = async ({ matchId, userId }) => {
  if (!matchId) {
    throw new ValidationError("matchId is required");
  }

  const chat = await chatRepo.findChatByIdLean(matchId);
  if (!chat) {
    throw new NotFoundError("Conversation");
  }
  const isParticipant = chat.participants.some((participant) => participant.toString() === userId.toString());
  if (!isParticipant) {
    throw new AppError({ message: "You are not part of this conversation", statusCode: 403 });
  }

  const result = await chatRepo.markMessagesAsSeen({ matchId, receiverId: userId });

  return { updated: result.modifiedCount ?? result.nModified ?? 0 };
};

export const deleteMessageService = async ({ messageId, userId }) => {
  if (!messageId) {
    throw new ValidationError("messageId is required");
  }

  const message = await chatRepo.findMessageById(messageId);
  if (!message) {
    throw new NotFoundError("Message");
  }

  if (message.senderId.toString() !== userId.toString()) {
    throw new AppError({ message: "You can only delete your own messages", statusCode: 403 });
  }

  await chatRepo.deleteMessageById(messageId);

  // If the deleted message was pinned, clear the chat reference so the pin
  // banner never points at a missing row.
  const unpinnedChat = await chatRepo.unpinChatOnMessageDelete(messageId);
  if (unpinnedChat) {
    const io = getIO();
    if (io) io.to(unpinnedChat._id.toString()).emit("message:unpinned", { chatId: unpinnedChat._id.toString() });
  }

  return message;
};

export const pinMessageService = async ({ chatId, messageId, userId }) => {
  if (!chatId || !messageId) {
    throw new ValidationError("chatId and messageId are required");
  }

  const chat = await chatRepo.findChatByIdLean(chatId);
  if (!chat) {
    throw new NotFoundError("Conversation");
  }
  const isParticipant = chat.participants.some((participant) => participant.toString() === userId.toString());
  if (!isParticipant) {
    throw new AppError({ message: "You are not part of this conversation", statusCode: 403 });
  }

  const message = await chatRepo.findMessageById(messageId);
  if (!message) {
    throw new NotFoundError("Message");
  }
  if (message.matchId.toString() !== chatId.toString()) {
    throw new ValidationError("Message does not belong to this conversation");
  }

  await Promise.all([
    chatRepo.setMessagePinned(messageId, new Date()),
    chatRepo.pinChatMessage(chatId, messageId),
  ]);

  const updated = await chatRepo.populatePinnedMessage(chatId);
  const pinnedMessage = updated.pinnedMessageId;

  const io = getIO();
  if (io) {
    io.to(chatId.toString()).emit("message:pinned", { chatId, message: pinnedMessage });
  }

  return pinnedMessage;
};

export const unpinMessageService = async ({ chatId, userId }) => {
  if (!chatId) {
    throw new ValidationError("chatId is required");
  }

  const chat = await chatRepo.findChatByIdLean(chatId);
  if (!chat) {
    throw new NotFoundError("Conversation");
  }
  const isParticipant = chat.participants.some((participant) => participant.toString() === userId.toString());
  if (!isParticipant) {
    throw new AppError({ message: "You are not part of this conversation", statusCode: 403 });
  }

  await chatRepo.unpinChatMessage(chatId);

  const io = getIO();
  if (io) {
    io.to(chatId.toString()).emit("message:unpinned", { chatId });
  }

  return { unpinned: true };
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
  pinMessageService,
  unpinMessageService,
};
