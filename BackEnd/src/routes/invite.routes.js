import { Router } from "express";
import { userAuth } from "../middlewares/auth.js";
import { inviteDailyLimit } from "../middlewares/inviteDailyLimit.js";
import {
  sendInviteController,
  getStatsController,
  listInvitesController,
  cancelInviteController,
} from "../controllers/invite.controller.js";

const router = Router();

router.post("/invite/send", userAuth, inviteDailyLimit, sendInviteController);
router.get("/invite/stats", userAuth, getStatsController);
router.get("/invite/history", userAuth, listInvitesController);
router.post("/invite/cancel/:inviteId", userAuth, cancelInviteController);

export default router;
