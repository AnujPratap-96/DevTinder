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
import validate from "../middlewares/validate.js";
import { banUserSchema, resolveReportSchema } from "../validations/admin.validation.js";
import { createPlanSchema, updatePlanSchema, planIdParamsSchema } from "../validations/plan.validation.js";

const router = Router();

router.get("/admin/users", userAuth, ensureAdmin, listUsersController);
router.get("/admin/users/:userId", userAuth, ensureAdmin, getUserController);

router.get("/admin/reports", userAuth, ensureAdmin, listReportsController);
router.patch(
  "/admin/reports/:id",
  userAuth,
  ensureAdmin,
  validate(resolveReportSchema),
  resolveReportController
);

router.get("/admin/banned", userAuth, ensureAdmin, listBannedController);
router.post(
  "/admin/unban",
  userAuth,
  ensureAdmin,
  validate(banUserSchema),
  unbanUserController
);

router.post(
  "/admin/ban",
  userAuth,
  ensureAdmin,
  validate(banUserSchema),
  banUserController
);

router.get("/admin/plans", userAuth, ensureAdmin, listPlansController);
router.post(
  "/admin/plans",
  userAuth,
  ensureAdmin,
  validate(createPlanSchema),
  createPlanController
);
router.patch(
  "/admin/plans/:id",
  userAuth,
  ensureAdmin,
  validate(updatePlanSchema),
  updatePlanController
);
router.delete(
  "/admin/plans/:id",
  userAuth,
  ensureAdmin,
  validate(planIdParamsSchema),
  deletePlanController
);

export default router;
