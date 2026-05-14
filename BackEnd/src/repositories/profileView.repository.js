import ProfileView from "../models/profileView.js";

export const findViewsByViewedUserId = (userId, limit = 100) => {
  return ProfileView.find({ viewedUserId: userId })
    .populate("viewerId", "firstName lastName photoUrl role")
    .sort({ viewedAt: -1 })
    .limit(limit)
    .lean();
};

export const upsertProfileView = (viewerId, viewedUserId) => {
  return ProfileView.findOneAndUpdate(
    { viewerId, viewedUserId },
    { viewedAt: new Date() },
    { upsert: true, setDefaultsOnInsert: true, new: true }
  );
};
