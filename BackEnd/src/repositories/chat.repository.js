import { Chat } from "../models/chat.js";
import Message from "../models/message.js";
import ConnectionRequest from "../models/connectionRequest.js";

export const findChatsByParticipant = (userId) => {
  return Chat.find({ participants: { $in: [userId] } }).lean();
};

export const findChatById = (chatId) => Chat.findById(chatId);

export const findChatByIdLean = (chatId) => Chat.findById(chatId).lean();

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

export const findMessages = (filter, { limit = 20, cursor = null, sort = { createdAt: -1 } } = {}) => {
  const query = { ...filter };
  if (cursor) query._id = { $lt: cursor };
  return Message.find(query).sort(sort).limit(limit + 1).lean();
};

export const deleteMessageById = (id) => Message.findByIdAndDelete(id);

export const markMessagesAsSeen = ({ matchId, receiverId }) =>
  Message.markAsSeen({ matchId, receiverId });

export const populateMessageSender = (messageId) =>
  Message.findById(messageId).populate("senderId", "firstName lastName photoUrl").lean();

export const updateChatLastMessage = (chatId, date) =>
  Chat.findByIdAndUpdate(chatId, { $set: { lastMessageAt: date || new Date() } });
