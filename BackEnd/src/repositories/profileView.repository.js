import ProfileView from "../models/profileView.js";

export const findViewsByViewedUserId = (userId, { limit = 20, cursor = null } = {}) => {
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const filter = { viewedUserId: userId };
  if (cursor) filter._id = { $lt: cursor };
  return ProfileView.find(filter)
    .populate("viewerId", "firstName lastName photoUrl role")
    .sort({ viewedAt: -1 })
    .limit(pageSize + 1)
    .lean();
};

export const upsertProfileView = (viewerId, viewedUserId) => {
  return ProfileView.findOneAndUpdate(
    { viewerId, viewedUserId },
    { viewedAt: new Date() },
    { upsert: true, setDefaultsOnInsert: true, new: true }
  );
};
