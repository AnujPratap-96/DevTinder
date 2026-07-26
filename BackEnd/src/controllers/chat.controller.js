import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getChatWithUser,
  listChatMessages,
  markMessagesSeenService,
  deleteMessageService,
  uploadChatImage,
} from "../services/chat.service.js";

export const getChatController = asyncHandler(async (req, res) => {
  const data = await getChatWithUser({
    userId: req.user._id,
    targetUserId: req.params.targetUserId,
    limit: req.query.limit,
    cursor: req.query.cursor,
  });
  return successResponse(res, { data });
});

export const listMessagesController = asyncHandler(async (req, res) => {
  const data = await listChatMessages({
    matchId: req.params.matchId,
    userId: req.user._id,
    limit: req.query.limit,
    cursor: req.query.cursor,
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

export const uploadChatImageController = asyncHandler(async (req, res) => {
  const message = await uploadChatImage({
    userId: req.user._id,
    targetUserId: req.body.targetUserId,
    matchId: req.body.matchId,
    file: req.file,
  });
  return successResponse(res, { data: { message } });
});
