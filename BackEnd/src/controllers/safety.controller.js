import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { blockUser, reportUser } from "../services/safety.service.js";

export const blockUserController = asyncHandler(async (req, res) => {
  const { userId } = req.body ?? {};
  const result = await blockUser({
    userId: req.user._id,
    targetUserId: userId,
  });
  return successResponse(res, { message: "User blocked", data: result });
});


export const reportUserController = asyncHandler(async (req, res) => {
  const { userId, reason, details } = req.body ?? {};
  const report = await reportUser({
    reporterId: req.user._id,
    reportedUserId: userId,
    reason: reason,
    details: details,
  });
  return successResponse(res, { statusCode: 201, message: "Report submitted", data: { report } });
});
