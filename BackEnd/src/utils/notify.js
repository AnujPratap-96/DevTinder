import { createNotification, formatNotification } from "../repositories/notification.repository.js";
import { emitToUser } from "./socket.js";

/**
 * Create a notification AND push it to the recipient in real-time
 * via their active socket connection (if any).
 *
 * Accepts the same payload as createNotification:
 *   { userId, type, payload, isRead?, readAt? }
 */
export const createNotificationAndNotify = async (payload) => {
  const doc = await createNotification(payload);
  emitToUser(payload.userId, "notification:new", formatNotification(doc));
  return doc;
};

export default createNotificationAndNotify;
