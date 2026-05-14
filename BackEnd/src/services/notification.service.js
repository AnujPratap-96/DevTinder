import Notification from "../models/notification.js";
import { ValidationError } from "../errors/index.js";

export const listNotifications = async ({ userId, limit = 100 }) => {
  if (!userId) {
    throw new ValidationError("User ID is required");
  }
  return Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export const markNotificationsAsRead = async ({ userId, notificationIds }) => {
  if (!userId) {
    return { modifiedCount: 0 };
  }
  const query = { userId };
  if (notificationIds?.length) {
    query._id = { $in: notificationIds };
  }
  return Notification.updateMany(query, {
    $set: { isRead: true, readAt: new Date() },
  }).exec();
};

export default {
  listNotifications,
  markNotificationsAsRead,
};
