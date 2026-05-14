import mongoose from "mongoose";

import User from "../models/user.model.js";
import Report from "../models/report.js";
import { ValidationError } from "../errors/index.js";

export const blockUser = async ({ userId, targetUserId }) => {
  if (!targetUserId || !mongoose.isValidObjectId(targetUserId)) {
    throw new ValidationError("Valid userId is required");
  }

  if (targetUserId.toString() === userId.toString()) {
    throw new ValidationError("You cannot block yourself");
  }

  await User.updateOne(
    { _id: userId },
    { $addToSet: { blockedUsers: targetUserId } }
  ).exec();

  return { blockedUserId: targetUserId };
};

export const reportUser = async ({ reporterId, reportedUserId, reason, details }) => {
  if (!reportedUserId || !reason) {
    throw new ValidationError("userId and reason are required");
  }

  const report = await Report.create({
    reporterId,
    reportedUserId,
    reason,
    details,
  });

  return report;
};

export default {
  blockUser,
  reportUser,
};
