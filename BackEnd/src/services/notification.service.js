import Notification from "../models/notification.js";
import { formatNotification } from "../repositories/notification.repository.js";
import { ValidationError, NotFoundError } from "../errors/index.js";

export const listNotifications = async ({ userId, limit = 100 }) => {
  if (!userId) {
    throw new ValidationError("User ID is required");
  }
  const docs = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.map(formatNotification);
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

export const deleteNotification = async ({ userId, notificationId }) => {
  if (!userId) {
    throw new ValidationError("User ID is required");
  }
  if (!notificationId) {
    throw new ValidationError("Notification ID is required");
  }
  const deleted = await Notification.findOneAndDelete({
    _id: notificationId,
    userId,
  }).exec();
  if (!deleted) {
    throw new NotFoundError("Notification");
  }
  return { deleted: true };
};

export const deleteAllNotifications = async ({ userId }) => {
  if (!userId) {
    throw new ValidationError("User ID is required");
  }
  const result = await Notification.deleteMany({ userId }).exec();
  return { deleted: result.deletedCount ?? 0 };
};

export default {
  listNotifications,
  markNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
};
