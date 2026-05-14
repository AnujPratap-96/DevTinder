import Notification from "../models/notification.js";

export const createNotification = (payload) => Notification.create(payload);
