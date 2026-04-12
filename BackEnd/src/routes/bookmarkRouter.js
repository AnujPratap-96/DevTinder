const express = require("express");
const mongoose = require("mongoose");
const { userAuth } = require("../middlewares/auth");
const Bookmark = require("../models/bookmark");

const bookmarkRouter = express.Router();

bookmarkRouter.post("/bookmark", userAuth, async (req, res) => {
  const { userId: savedUserId } = req.body ?? {};
  const userId = req.user._id;

  if (!savedUserId || !mongoose.isValidObjectId(savedUserId)) {
    return res.status(400).json({ message: "Valid userId is required" });
  }

  if (savedUserId.toString() === userId.toString()) {
    return res.status(400).json({ message: "You cannot bookmark yourself" });
  }

  const bookmark = await Bookmark.findOneAndUpdate(
    { userId, savedUserId },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({ bookmark });
});

bookmarkRouter.get("/bookmarks", userAuth, async (req, res) => {
  const userId = req.user._id;
  const bookmarks = await Bookmark.find({ userId })
    .populate("savedUserId", "firstName lastName photoUrl role availability")
    .lean();
  res.status(200).json({ bookmarks });
});

module.exports = bookmarkRouter;
