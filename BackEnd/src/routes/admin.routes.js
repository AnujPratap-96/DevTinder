import { Router } from "express";
import {
  ensureAdmin,
  listUsersController,
  getUserController,
  listReportsController,
  banUserController,
  listBannedController,
  unbanUserController,
  resolveReportController,
  listPlansController,
  createPlanController,
  updatePlanController,
  deletePlanController,
} from "../controllers/admin.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

// Users
router.get("/admin/users", userAuth, ensureAdmin, listUsersController);
router.get("/admin/users/:userId", userAuth, ensureAdmin, getUserController);

// Reports
router.get("/admin/reports", userAuth, ensureAdmin, listReportsController);
router.patch("/admin/reports/:id", userAuth, ensureAdmin, resolveReportController);

// Banned
router.get("/admin/banned", userAuth, ensureAdmin, listBannedController);
router.post("/admin/unban", userAuth, ensureAdmin, unbanUserController);

// Ban
router.post("/admin/ban", userAuth, ensureAdmin, banUserController);

// Plans (admin-managed)
router.get("/admin/plans", userAuth, ensureAdmin, listPlansController);
router.post("/admin/plans", userAuth, ensureAdmin, createPlanController);
router.patch("/admin/plans/:id", userAuth, ensureAdmin, updatePlanController);
router.delete("/admin/plans/:id", userAuth, ensureAdmin, deletePlanController);

export default router;
