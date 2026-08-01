import mongoose from "mongoose";

import * as userRepo from "../repositories/user.repository.js";
import * as reportRepo from "../repositories/report.repository.js";
import { ValidationError } from "../errors/index.js";

export const blockUser = async ({ userId, targetUserId }) => {
  if (!targetUserId || !mongoose.isValidObjectId(targetUserId)) {
    throw new ValidationError("Valid userId is required");
  }

  if (targetUserId.toString() === userId.toString()) {
    throw new ValidationError("You cannot block yourself");
  }

  await userRepo.updateUserById(
    userId,
    { $addToSet: { blockedUsers: targetUserId } }
  );

  return { blockedUserId: targetUserId };
};

export const reportUser = async ({ reporterId, reportedUserId, reason, details }) => {
  if (!reportedUserId || !reason) {
    throw new ValidationError("userId and reason are required");
  }

  const report = await reportRepo.createReport({
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
