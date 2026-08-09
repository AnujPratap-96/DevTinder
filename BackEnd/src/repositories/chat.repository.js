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

export const setMessagePinned = (messageId, pinnedAt) =>
  Message.findByIdAndUpdate(messageId, { $set: { pinnedAt } });

export const pinChatMessage = (chatId, messageId) =>
  Chat.findByIdAndUpdate(chatId, { $set: { pinnedMessageId: messageId } });

export const unpinChatMessage = (chatId) =>
  Chat.findByIdAndUpdate(chatId, { $unset: { pinnedMessageId: 1 } });

// Clear the chat's pinned reference when the pinned message itself is deleted.
export const unpinChatOnMessageDelete = (messageId) =>
  Chat.findOneAndUpdate({ pinnedMessageId: messageId }, { $unset: { pinnedMessageId: 1 } }).lean();

export const populatePinnedMessage = (chatId) =>
  Chat.findById(chatId)
    .populate({
      path: "pinnedMessageId",
      populate: { path: "senderId", select: "firstName lastName photoUrl" },
    })
    .lean();

export const markMessagesAsSeen = ({ matchId, receiverId }) =>
  Message.markAsSeen({ matchId, receiverId });

export const populateMessageSender = (messageId) =>
  Message.findById(messageId).populate("senderId", "firstName lastName photoUrl").lean();

export const updateChatLastMessage = (chatId, date) =>
  Chat.findByIdAndUpdate(chatId, { $set: { lastMessageAt: date || new Date() } });
