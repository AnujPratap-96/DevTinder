import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { listUsers, listReports, banUser } from "../services/admin.service.js";

export const ensureAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Admin privileges required" });
  }
  return next();
};

export const listUsersController = asyncHandler(async (req, res) => {
  const users = await listUsers();
  return successResponse(res, { data: { users } });
});

export const listReportsController = asyncHandler(async (req, res) => {
  const reports = await listReports();
  return successResponse(res, { data: { reports } });
});

export const banUserController = asyncHandler(async (req, res) => {
  const result = await banUser(req.body?.userId);
  return successResponse(res, { message: "User banned", data: result });
});
