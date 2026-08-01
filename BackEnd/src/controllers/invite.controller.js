import { asyncHandler } from "../utils/async-handler.js";
import { successResponse } from "../utils/response.js";
import * as inviteService from "../services/invite.service.js";

export const sendInviteController = asyncHandler(async (req, res) => {
  const { email } = req.body ?? {};
  const result = await inviteService.sendInvite({ userId: req.user._id, email });
  return successResponse(res, { message: "Invitation sent successfully!", data: { invite: result } });
});

export const getStatsController = asyncHandler(async (req, res) => {
  const stats = await inviteService.getStats(req.user._id);
  return successResponse(res, { message: "Invite stats fetched", data: stats });
});

export const listInvitesController = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const cursor = req.query.cursor || null;
  const result = await inviteService.listInvites(req.user._id, { limit, cursor });
  return successResponse(res, { message: "Invites fetched", data: result });
});

export const cancelInviteController = asyncHandler(async (req, res) => {
  const { inviteId } = req.params;
  await inviteService.cancelInvite({ userId: req.user._id, inviteId });
  return successResponse(res, { message: "Invite cancelled", data: { cancelled: true } });
});
