import { AppError } from "../errors/index.js";
import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  listUsers,
  listReports,
  banUser,
  listBanned,
  unbanUser,
  resolveReport,
  getUserPublic,
} from "../services/admin.service.js";
import {
  listPlansController,
  createPlanController,
  updatePlanController,
  deletePlanController,
} from "../controllers/plan.controller.js";

export const ensureAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return next(new AppError({ message: "Admin privileges required", statusCode: 403, errorCode: "ADMIN_REQUIRED" }));
  }
  return next();
};

export const listUsersController = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  const cursor = req.query.cursor || null;
  const { search, role, availability, banned } = req.query;
  const result = await listUsers({ limit, cursor, search, role, availability, banned });
  return successResponse(res, { message: "Users fetched", data: result });
});

export const getUserController = asyncHandler(async (req, res) => {
  const user = await getUserPublic(req.params.userId);
  return successResponse(res, { message: "User fetched", data: { user } });
});

export const listReportsController = asyncHandler(async (req, res) => {
  const reports = await listReports();
  return successResponse(res, { message: "Reports fetched", data: { reports } });
});

export const banUserController = asyncHandler(async (req, res) => {
  const result = await banUser(req.body?.userId);
  return successResponse(res, { message: "User banned", data: { ban: result } });
});

export const listBannedController = asyncHandler(async (req, res) => {
  const users = await listBanned();
  return successResponse(res, { message: "Banned users fetched", data: { users } });
});

export const unbanUserController = asyncHandler(async (req, res) => {
  const result = await unbanUser(req.body?.userId);
  return successResponse(res, { message: "User unbanned", data: { unban: result } });
});

export const resolveReportController = asyncHandler(async (req, res) => {
  const report = await resolveReport({
    reportId: req.params.id,
    status: req.body?.status,
    reviewerId: req.user?._id,
  });
  return successResponse(res, { message: "Report updated", data: { report } });
});

export {
  listPlansController,
  createPlanController,
  updatePlanController,
  deletePlanController,
};
