import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  sendConnectionRequest,
  reviewConnectionRequest,
} from "../services/request.service.js";

export const sendRequestController = asyncHandler(async (req, res) => {
  const { status, touserId } = req.params;
  const request = await sendConnectionRequest({
    fromUser: req.user,
    toUserId: touserId,
    status,
  });

  return successResponse(res, {
    message: `${req.user.firstName} has marked ${status}`,
    data: { request },
  });
});

export const reviewRequestController = asyncHandler(async (req, res) => {
  const { requestId, status } = req.params;
  const updated = await reviewConnectionRequest({
    requestId,
    status,
    reviewer: req.user,
  });

  return successResponse(res, {
    message: `Connection Request is ${status}`,
    data: { request: updated },
  });
});
