const Notification = require("../models/notification");

const createNotification = async ({ userId, type, payload = {} }) => {
  if (!userId || !type) return null;
  const notification = await Notification.create({ userId, type, payload });
  return notification;
};

const markNotificationsAsRead = async ({ userId, notificationIds }) => {
  if (!userId) return { modifiedCount: 0 };
  const query = { userId };
  if (notificationIds?.length) {
    query._id = { $in: notificationIds };
  }
  return Notification.updateMany(query, {
    $set: { isRead: true, readAt: new Date() },
  }).exec();
};

module.exports = {
  createNotification,
  markNotificationsAsRead,
};
