import mongoose from "mongoose";

import User from "../models/user.model.js";
import Report from "../models/report.js";
import { ValidationError, AppError } from "../errors/index.js";

export const listUsers = async () => {
  return User.find()
    .select("firstName lastName emailId role availability isAdmin createdAt")
    .limit(200)
    .lean();
};

export const listReports = async () => {
  return Report.find()
    .populate("reporterId", "firstName lastName emailId")
    .populate("reportedUserId", "firstName lastName emailId")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
};

export const banUser = async (userId) => {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new ValidationError("Valid userId is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError({ message: "User not found", statusCode: 404 });
  }

  user.availability = "not_looking";
  user.isBanned = true;
  user.blockedUsers = [];
  await user.save();

  return { userId }; 
};

export default {
  listUsers,
  listReports,
  banUser,
};
