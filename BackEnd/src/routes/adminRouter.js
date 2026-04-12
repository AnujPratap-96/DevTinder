const express = require("express");
const mongoose = require("mongoose");
const { userAuth } = require("../middlewares/auth");
const User = require("../models/user");
const Report = require("../models/report");

const adminRouter = express.Router();

const ensureAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Admin privileges required" });
  }
  return next();
};

adminRouter.get("/admin/users", userAuth, ensureAdmin, async (req, res) => {
  const users = await User.find()
    .select("firstName lastName emailId role availability isAdmin createdAt")
    .limit(200)
    .lean();
  res.status(200).json({ users });
});

adminRouter.get("/admin/reports", userAuth, ensureAdmin, async (req, res) => {
  const reports = await Report.find()
    .populate("reporterId", "firstName lastName emailId")
    .populate("reportedUserId", "firstName lastName emailId")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.status(200).json({ reports });
});

adminRouter.post("/admin/ban", userAuth, ensureAdmin, async (req, res) => {
  const { userId } = req.body ?? {};
  if (!userId || !mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: "Valid userId is required" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.availability = "not_looking";
  user.isBanned = true;
  user.blockedUsers = [];
  await user.save();

  res.status(200).json({ message: "User banned", userId });
});

module.exports = adminRouter;
