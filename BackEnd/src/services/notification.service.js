import * as notifRepo from "../repositories/notification.repository.js";
import { ValidationError, NotFoundError } from "../errors/index.js";

export const listNotifications = async ({ userId, limit = 20, cursor = null }) => {
  if (!userId) {
    throw new ValidationError("User ID is required");
  }
  const filter = { userId };
  if (cursor) filter._id = { $lt: cursor };
  const docs = await notifRepo.listNotifications(filter, { limit });
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const hasMore = docs.length > pageSize;
  const notifications = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? notifications[notifications.length - 1]._id : null;
  return { notifications: notifications.map(notifRepo.formatNotification), nextCursor, hasMore };
};

export const markNotificationsAsRead = async ({ userId, notificationIds }) => {
  if (!userId) {
    return { modifiedCount: 0 };
  }
  return notifRepo.updateNotifications(userId, notificationIds, { isRead: true, readAt: new Date() });
};

export const deleteNotification = async ({ userId, notificationId }) => {
  if (!userId) {
    throw new ValidationError("User ID is required");
  }
  if (!notificationId) {
    throw new ValidationError("Notification ID is required");
  }
  const deleted = await notifRepo.deleteNotificationById(notificationId, userId);
  if (!deleted) {
    throw new NotFoundError("Notification");
  }
  return { deleted: true };
};

export const deleteAllNotifications = async ({ userId }) => {
  if (!userId) {
    throw new ValidationError("User ID is required");
  }
  const result = await notifRepo.deleteAllNotifications(userId);
  return { deleted: result.deletedCount ?? 0 };
};

export default {
  listNotifications,
  markNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
};
