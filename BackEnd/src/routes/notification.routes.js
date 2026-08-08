import { Router } from "express";

import {
  listNotificationsController,
  markNotificationsController,
  deleteNotificationController,
  deleteAllNotificationsController,
} from "../controllers/notification.controller.js";
import { userAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import {
  markNotificationsSchema,
  deleteNotificationParamsSchema,
} from "../validations/notification.validation.js";

const router = Router();

router.get("/notifications", userAuth, listNotificationsController);
router.patch(
  "/notifications/read",
  userAuth,
  validate(markNotificationsSchema),
  markNotificationsController
);
router.delete("/notifications", userAuth, deleteAllNotificationsController);
router.delete(
  "/notifications/:id",
  userAuth,
  validate(deleteNotificationParamsSchema),
  deleteNotificationController
);

export default router;
