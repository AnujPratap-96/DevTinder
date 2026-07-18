import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  listNotifications,
  markNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
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

export const deleteNotificationController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await deleteNotification({
    userId: req.user._id,
    notificationId: id,
  });
  return successResponse(res, {
    message: "Notification deleted",
    data: result,
  });
});

export const deleteAllNotificationsController = asyncHandler(async (req, res) => {
  const result = await deleteAllNotifications({ userId: req.user._id });
  return successResponse(res, {
    message: "All notifications cleared",
    data: result,
  });
});
