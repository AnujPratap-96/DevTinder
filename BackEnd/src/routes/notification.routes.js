import { Router } from "express";

import {
  listNotificationsController,
  markNotificationsController,
  deleteNotificationController,
  deleteAllNotificationsController,
} from "../controllers/notification.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/notifications", userAuth, listNotificationsController);
router.patch("/notifications/read", userAuth, markNotificationsController);
router.delete("/notifications", userAuth, deleteAllNotificationsController);
router.delete("/notifications/:id", userAuth, deleteNotificationController);

export default router;
