/**
 * enhancement.controller.js — Phase-1 chat enhancement HTTP handlers.
 */
import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as enhancementService from "./enhancement.service.js";

export const uploadVoiceNoteController = asyncHandler(async (req, res) => {
  const message = await enhancementService.uploadVoiceNote({
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
  const messages = await enhancementService.searchMessages({
    userId: req.user._id,
    matchId: req.query.matchId,
    query: req.query.q || "",
    pinnedOnly: req.query.pinned === "true",
    limit: Number(req.query.limit) || undefined,
  });
  return successResponse(res, { message: "Messages fetched", data: { messages } });
});

export const togglePinMessageController = asyncHandler(async (req, res) => {
  const result = await enhancementService.togglePinMessage({
    userId: req.user._id,
    messageId: req.params.messageId,
  });
  return successResponse(res, { message: "Message pin updated", data: result });
});

export const getChatPrefsController = asyncHandler(async (req, res) => {
  const prefs = await enhancementService.getChatPrefs(req.user._id);
  return successResponse(res, { message: "Chat prefs fetched", data: { prefs } });
});

export const setChatPrefController = asyncHandler(async (req, res) => {
  const result = await enhancementService.setChatPref({
    userId: req.user._id,
    matchId: req.body.matchId,
    pinned: req.body.pinned,
    muted: req.body.muted,
  });
  return successResponse(res, { message: "Chat prefs updated", data: result });
});

export const reactToMessageController = asyncHandler(async (req, res) => {
  const reactions = await enhancementService.addReaction({
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
  togglePinMessageController,
  getChatPrefsController,
  setChatPrefController,
  reactToMessageController,
};
