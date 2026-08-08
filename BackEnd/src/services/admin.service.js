import mongoose from "mongoose";

import * as userRepo from "../repositories/user.repository.js";
import * as reportRepo from "../repositories/report.repository.js";
import Message from "../models/message.js"; // [PHASE-3]
import { ValidationError, AppError } from "../errors/index.js";

export const listUsers = async ({
  limit = 20,
  cursor = null,
  search = "",
  role = "",
  availability = "",
  banned = "",
} = {}) => {
  const filter = { isAdmin: { $ne: true } };

  if (search && search.trim()) {
    const re = new RegExp(search.trim(), "i");
    filter.$or = [{ firstName: re }, { lastName: re }, { emailId: re }];
  }
  if (role && role.trim()) {
    filter.role = new RegExp(role.trim(), "i");
  }
  if (availability && availability.trim()) {
    filter.availability = availability.trim();
  }
  if (banned === "true") {
    filter.isBanned = true;
  } else if (banned === "false") {
    filter.isBanned = false;
  }

  if (cursor) {
    if (!mongoose.isValidObjectId(cursor)) {
      throw new ValidationError("Invalid cursor");
    }
    filter._id = { $gt: new mongoose.Types.ObjectId(cursor) };
  }

  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const docs = await userRepo.findUsers(filter)
    .select("firstName lastName emailId role availability isAdmin isBanned createdAt")
    .sort({ _id: 1 })
    .limit(pageSize + 1)
    .lean();

  const hasMore = docs.length > pageSize;
  const users = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? users[users.length - 1]._id : null;
  return { users, nextCursor, hasMore };
};

const PUBLIC_USER_FIELDS = [
  "firstName",
  "lastName",
  "emailId",
  "photoUrl",
  "avatarUrl",
  "age",
  "gender",
  "about",
  "skills",
  "role",
  "experienceYears",
  "availability",
  "githubProfile",
  "socialLinks",
  "city",
  "country",
  "isAdmin",
  "isPremium",
  "membershipType",
  "membershipExpiresAt",
  "profileStrength",
  "lastSeenAt",
  "isOnline",
  "createdAt",
].join(" ");

export const getUserPublic = async (userId) => {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new ValidationError("Valid userId is required");
  }
  const user = await userRepo.findUserById(userId).select(PUBLIC_USER_FIELDS).lean();
  if (!user) {
    throw new AppError({ message: "User not found", statusCode: 404 });
  }
  return user;
};

export const listReports = async () => {
  return reportRepo.findReportsPopulated();
};

export const banUser = async (userId) => {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new ValidationError("Valid userId is required");
  }

  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw new AppError({ message: "User not found", statusCode: 404 });
  }

  user.availability = "not_looking";
  user.isBanned = true;
  user.bannedAt = new Date();
  user.blockedUsers = [];
  await userRepo.saveUser(user);

  return { userId };
};

export const listBanned = async () => {
  return userRepo.findUsers({ isBanned: true })
    .select("firstName lastName emailId role membershipType createdAt bannedAt")
    .sort({ bannedAt: -1 })
    .lean();
};

export const unbanUser = async (userId) => {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new ValidationError("Valid userId is required");
  }

  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw new AppError({ message: "User not found", statusCode: 404 });
  }

  user.isBanned = false;
  user.availability = "open";
  await userRepo.saveUser(user);

  return { userId };
};

export const resolveReport = async ({ reportId, status, reviewerId }) => {
  if (!reportId || !mongoose.isValidObjectId(reportId)) {
    throw new ValidationError("Valid reportId is required");
  }
  const allowed = ["open", "reviewing", "resolved"];
  if (!allowed.includes(status)) {
    throw new ValidationError("Invalid status");
  }

  const report = await reportRepo.findReportById(reportId);
  if (!report) {
    throw new AppError({ message: "Report not found", statusCode: 404 });
  }

  report.status = status;
  report.reviewedBy = reviewerId;
  report.reviewedAt = new Date();
  await report.save();

  return report;
};

// ── [PHASE-3] moderation review queue ────────────────────────────────────

export const listFlaggedMessages = async ({ limit = 20, cursor = null } = {}) => {
  const filter = { "moderation.flagged": true };
  if (cursor) {
    if (!mongoose.isValidObjectId(cursor)) {
      throw new ValidationError("Invalid cursor");
    }
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const docs = await Message.find(filter)
    .populate("senderId", "firstName lastName emailId photoUrl")
    .sort({ createdAt: -1 })
    .limit(pageSize + 1)
    .lean();

  const hasMore = docs.length > pageSize;
  const messages = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? messages[messages.length - 1]._id : null;
  return { messages, nextCursor, hasMore };
};

export const reviewFlaggedMessage = async ({ messageId, reviewerId }) => {
  if (!messageId || !mongoose.isValidObjectId(messageId)) {
    throw new ValidationError("Valid messageId is required");
  }
  const message = await Message.findByIdAndUpdate(
    messageId,
    { $set: { "moderation.reviewedAt": new Date(), "moderation.reviewedBy": reviewerId } },
    { new: true }
  );
  if (!message) {
    throw new AppError({ message: "Message not found", statusCode: 404 });
  }
  return message;
};

export default {
  listUsers,
  listReports,
  banUser,
};
