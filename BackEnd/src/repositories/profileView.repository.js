import ProfileView from "../models/profileView.js";

export const findViewsByViewedUserId = async (userId, { limit = 20, cursor = null } = {}) => {
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const filter = { viewedUserId: userId };
  if (cursor) filter._id = { $lt: cursor };
  const docs = await ProfileView.find(filter)
    .populate("viewerId", "firstName lastName photoUrl role")
    .sort({ viewedAt: -1 })
    .limit(pageSize + 1)
    .lean();
  const hasMore = docs.length > pageSize;
  const views = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? views[views.length - 1]._id : null;
  return { views, nextCursor, hasMore };
};

export const upsertProfileView = (viewerId, viewedUserId) => {
  return ProfileView.findOneAndUpdate(
    { viewerId, viewedUserId },
    { viewedAt: new Date() },
    { upsert: true, setDefaultsOnInsert: true, new: true }
  );
};
