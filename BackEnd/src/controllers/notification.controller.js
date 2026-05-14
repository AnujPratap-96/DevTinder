import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  listNotifications,
  markNotificationsAsRead,
} from "../services/notification.service.js";

export const listNotificationsController = asyncHandler(async (req, res) => {
  const notifications = await listNotifications({ userId: req.user._id });
  return successResponse(res, { data: { notifications } });
});

export const markNotificationsController = asyncHandler(async (req, res) => {
  const { notificationIds } = req.body ?? {};
  const result = await markNotificationsAsRead({
    userId: req.user._id,
    notificationIds,
  });
  return successResponse(res, { data: { updated: result.modifiedCount ?? 0 } });
});
