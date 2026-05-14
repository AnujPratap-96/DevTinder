import { Chat } from "../models/chat.js";

export const findChatsByParticipant = (userId) => {
  return Chat.find({ participants: { $in: [userId] } }).lean();
};
