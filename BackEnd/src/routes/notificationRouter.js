const express = require("express");
const { userAuth } = require("../middlewares/auth");
const Notification = require("../models/notification");
const { markNotificationsAsRead } = require("../services/notificationService");

const notificationRouter = express.Router();

notificationRouter.get("/notifications", userAuth, async (req, res) => {
  const userId = req.user._id;
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.status(200).json({ notifications });
});

notificationRouter.patch("/notifications/read", userAuth, async (req, res) => {
  const { notificationIds } = req.body ?? {};
  const userId = req.user._id;
  const result = await markNotificationsAsRead({ userId, notificationIds });
  res.status(200).json({ updated: result.modifiedCount ?? 0 });
});

module.exports = notificationRouter;
