const express = require("express");
const mongoose = require("mongoose");
const { userAuth } = require("../middlewares/auth");
const User = require("../models/user");
const Report = require("../models/report");

const safetyRouter = express.Router();

safetyRouter.post("/block", userAuth, async (req, res) => {
  const { userId: targetUserId } = req.body ?? {};
  const userId = req.user._id;

  if (!targetUserId || !mongoose.isValidObjectId(targetUserId)) {
    return res.status(400).json({ message: "Valid userId is required" });
  }

  if (targetUserId.toString() === userId.toString()) {
    return res.status(400).json({ message: "You cannot block yourself" });
  }

  await User.updateOne(
    { _id: userId },
    { $addToSet: { blockedUsers: targetUserId } }
  ).exec();

  res.status(200).json({ message: "User blocked" });
});

safetyRouter.post("/report", userAuth, async (req, res) => {
  const { userId: reportedUserId, reason, details } = req.body ?? {};
  const reporterId = req.user._id;

  if (!reportedUserId || !reason) {
    return res.status(400).json({ message: "userId and reason are required" });
  }

  const report = await Report.create({
    reporterId,
    reportedUserId,
    reason,
    details,
  });

  res.status(201).json({ message: "Report submitted", report });
});

module.exports = safetyRouter;
