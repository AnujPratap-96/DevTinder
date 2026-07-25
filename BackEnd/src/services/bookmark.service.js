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

export const listBookmarks = async (userId, { limit = 20, cursor = null } = {}) => {
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const filter = { userId };
  if (cursor) filter._id = { $lt: cursor };
  const docs = await Bookmark.find(filter)
    .sort({ createdAt: -1 })
    .limit(pageSize + 1)
    .populate("savedUserId", "firstName lastName photoUrl role availability")
    .lean();
  const hasMore = docs.length > pageSize;
  const bookmarks = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? bookmarks[bookmarks.length - 1]._id : null;
  return { bookmarks, nextCursor, hasMore };
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
