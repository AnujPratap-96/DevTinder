import { Router } from "express";

import {
  ensureAdmin,
  listUsersController,
  listReportsController,
  banUserController,
} from "../controllers/admin.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/admin/users", userAuth, ensureAdmin, listUsersController);
router.get("/admin/reports", userAuth, ensureAdmin, listReportsController);
router.post("/admin/ban", userAuth, ensureAdmin, banUserController);

export default router;
