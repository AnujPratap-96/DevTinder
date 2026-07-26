import { Chat } from "../models/chat.js";
import Message from "../models/message.js";
import ConnectionRequest from "../models/connectionRequest.js";

export const findChatsByParticipant = (userId) => {
  return Chat.find({ participants: { $in: [userId] } }).lean();
};

export const findChatById = (chatId) => Chat.findById(chatId);

export const findOrCreateChat = (userId, targetUserId) =>
  Chat.findOrCreateByParticipants(userId, targetUserId);

export const ensureConnection = async (userId, targetUserId) => {
  const connection = await ConnectionRequest.findOne({
    $or: [
      { fromUserId: userId, toUserId: targetUserId, status: "accepted" },
      { toUserId: userId, fromUserId: targetUserId, status: "accepted" },
    ],
  }).lean();
  return !!connection;
};

export const createMessage = (data) => Message.create(data);

export const findMessageById = (id) => Message.findById(id);

export const populateMessageSender = (messageId) =>
  Message.findById(messageId).populate("senderId", "firstName lastName photoUrl").lean();

export const updateChatLastMessage = (chatId, date) =>
  Chat.findByIdAndUpdate(chatId, { $set: { lastMessageAt: date || new Date() } });
