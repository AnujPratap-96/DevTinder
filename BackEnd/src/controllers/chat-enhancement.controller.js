import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as chatEnhancementService from "../services/chat-enhancement.service.js";

export const uploadVoiceNoteController = asyncHandler(async (req, res) => {
  const message = await chatEnhancementService.uploadVoiceNote({
    userId: req.user._id,
    targetUserId: req.body.targetUserId,
    matchId: req.body.matchId,
    file: req.file,
    clientMessageId: req.body.clientMessageId,
    durationSec: req.body.durationSec,
  });
  return successResponse(res, { message: "Voice note uploaded", data: { message } });
});

export const searchMessagesController = asyncHandler(async (req, res) => {
  const messages = await chatEnhancementService.searchMessages({
    userId: req.user._id,
    matchId: req.query.matchId,
    query: req.query.q || "",
    pinnedOnly: req.query.pinned === "true",
    limit: Number(req.query.limit) || undefined,
  });
  return successResponse(res, { message: "Messages fetched", data: { messages } });
});

export const getChatPrefsController = asyncHandler(async (req, res) => {
  const prefs = await chatEnhancementService.getChatPrefs(req.user._id);
  return successResponse(res, { message: "Chat prefs fetched", data: { prefs } });
});

export const setChatPrefController = asyncHandler(async (req, res) => {
  const result = await chatEnhancementService.setChatPref({
    userId: req.user._id,
    matchId: req.body.matchId,
    pinned: req.body.pinned,
    muted: req.body.muted,
  });
  return successResponse(res, { message: "Chat prefs updated", data: result });
});

export const reactToMessageController = asyncHandler(async (req, res) => {
  const reactions = await chatEnhancementService.addReaction({
    userId: req.user._id,
    matchId: req.body.matchId,
    messageId: req.params.messageId,
    emoji: req.body.emoji,
  });
  return successResponse(res, { message: "Reaction updated", data: { reactions } });
});

export default {
  uploadVoiceNoteController,
  searchMessagesController,
  getChatPrefsController,
  setChatPrefController,
  reactToMessageController,
};
