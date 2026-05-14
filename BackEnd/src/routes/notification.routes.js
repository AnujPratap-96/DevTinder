import { Router } from "express";

import {
  listNotificationsController,
  markNotificationsController,
} from "../controllers/notification.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/notifications", userAuth, listNotificationsController);
router.patch("/notifications/read", userAuth, markNotificationsController);

export default router;
