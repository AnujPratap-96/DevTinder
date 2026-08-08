import Notification from "../models/notification.js";

// Keys that reveal internal identifiers (Mongo ObjectIds, join keys). These
// must never be sent to the client — notifications only need display data.
const INTERNAL_ID_KEYS = new Set([
  "fromUserId",
  "toUserId",
  "requestId",
  "projectId",
  "requesterId",
  "matchId",
  "senderId",
  "clientMessageId",
  "userId",
]);

// Strip internal identifiers from a notification before it leaves the server,
// keeping only what the UI needs to render (and the doc's own _id so the client
// can still mark/read/delete it).
export const formatNotification = (doc) => {
  if (!doc) return doc;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const { _id, type, isRead, createdAt, readAt, payload } = obj;
  const safePayload = {};
  for (const [key, value] of Object.entries(payload ?? {})) {
    if (!INTERNAL_ID_KEYS.has(key)) safePayload[key] = value;
  }
  return { _id, type, isRead, createdAt, readAt, payload: safePayload };
};

export const listNotifications = (filter = {}, { limit = 20, cursor = null } = {}) => {
  const query = { ...filter };
  if (cursor) query._id = { $lt: cursor };
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  return Notification.find(query).sort({ createdAt: -1 }).limit(pageSize + 1).lean();
};

export const createNotification = (payload) => Notification.create(payload);

export const deleteNotificationById = (notificationId, userId) =>
  Notification.findOneAndDelete({ _id: notificationId, userId }).exec();

export const updateNotifications = (userId, notificationIds = [], updates) => {
  const query = { userId };
  if (notificationIds?.length) {
    query._id = { $in: notificationIds };
  }
  return Notification.updateMany(query, { $set: updates }).exec();
};

export const deleteAllNotifications = (userId) =>
  Notification.deleteMany({ userId }).exec();
