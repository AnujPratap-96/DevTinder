import { asyncHandler } from "../utils/async-handler.js";
import { successResponse } from "../utils/response.js";
import * as inviteService from "../services/invite.service.js";

export const sendInviteController = asyncHandler(async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Valid email is required", error: "VALIDATION_ERROR" });
  }
  const result = await inviteService.sendInvite({ userId: req.user._id, email });
  return successResponse(res, { message: "Invitation sent successfully!", data: result });
});

export const getStatsController = asyncHandler(async (req, res) => {
  const stats = await inviteService.getStats(req.user._id);
  return successResponse(res, { data: stats });
});

export const listInvitesController = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const result = await inviteService.listInvites(req.user._id, { page, limit });
  return successResponse(res, { data: result });
});

export const cancelInviteController = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  if (!inviteId) return res.status(400).json({ success: false, message: "inviteId is required", error: "VALIDATION_ERROR" });
  await inviteService.cancelInvite({ userId: req.user._id, inviteId });
  return successResponse(res, { message: "Invite cancelled" });
});
