import { Router } from "express";
import { userAuth } from "../middlewares/auth.js";
import { inviteDailyLimit } from "../middlewares/inviteDailyLimit.js";
import validate from "../middlewares/validate.js";
import {
  sendInviteController,
  getStatsController,
  listInvitesController,
  cancelInviteController,
} from "../controllers/invite.controller.js";
import { createInviteSchema, cancelInviteParamsSchema } from "../validations/invite.validation.js";

const router = Router();

router.post(
  "/invite/send",
  userAuth,
  inviteDailyLimit,
  validate(createInviteSchema),
  sendInviteController
);
router.get("/invite/stats", userAuth, getStatsController);
router.get("/invite/history", userAuth, listInvitesController);
router.post(
  "/invite/cancel/:inviteId",
  userAuth,
  validate(cancelInviteParamsSchema),
  cancelInviteController
);

export default router;
