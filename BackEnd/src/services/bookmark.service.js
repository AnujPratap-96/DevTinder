import mongoose from "mongoose";

import Bookmark from "../models/bookmark.js";
import { ValidationError } from "../errors/index.js";

export const upsertBookmark = async ({ userId, savedUserId }) => {
  if (!savedUserId || !mongoose.isValidObjectId(savedUserId)) {
    throw new ValidationError("Valid userId is required");
  }

  if (savedUserId.toString() === userId.toString()) {
    throw new ValidationError("You cannot bookmark yourself");
  }

  return Bookmark.findOneAndUpdate(
    { userId, savedUserId },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const listBookmarks = async (userId) => {
  return Bookmark.find({ userId })
    .populate("savedUserId", "firstName lastName photoUrl role availability")
    .lean();
};

export const removeBookmark = async ({ userId, savedUserId }) => {
  if (!savedUserId || !mongoose.isValidObjectId(savedUserId)) {
    throw new ValidationError("Valid userId is required");
  }
  return Bookmark.findOneAndDelete({ userId, savedUserId });
};

export default {
  upsertBookmark,
  listBookmarks,
  removeBookmark,
};
