import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getChatWithUser,
  listChatMessages,
  markMessagesSeenService,
  deleteMessageService,
} from "../services/chat.service.js";

export const getChatController = asyncHandler(async (req, res) => {
  const data = await getChatWithUser({
    userId: req.user._id,
    targetUserId: req.params.targetUserId,
    pagination: req.query,
  });
  return successResponse(res, { data });
});

export const listMessagesController = asyncHandler(async (req, res) => {
  const data = await listChatMessages({
    matchId: req.params.matchId,
    userId: req.user._id,
    pagination: req.query,
  });
  return successResponse(res, { data });
});

export const markMessagesSeenController = asyncHandler(async (req, res) => {
  const result = await markMessagesSeenService({
    matchId: req.body?.matchId,
    userId: req.user._id,
  });
  return successResponse(res, { data: result });
});

export const deleteMessageController = asyncHandler(async (req, res) => {
  const message = await deleteMessageService({
    messageId: req.params.messageId,
    userId: req.user._id,
  });
  return successResponse(res, { message: "Message deleted" });
});
