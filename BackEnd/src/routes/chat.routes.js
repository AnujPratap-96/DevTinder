import { Router } from "express";

import {
  getChatController,
  listMessagesController,
  markMessagesSeenController,
} from "../controllers/chat.controller.js";
import { userAuth } from "../middlewares/auth.js";
import { requireMinimumPlan } from "../middlewares/requirePlan.js";

const router = Router();
const planGuard = [userAuth, requireMinimumPlan("silver")];

router.get("/chat/:targetUserId", ...planGuard, getChatController);
router.get("/messages/:matchId", ...planGuard, listMessagesController);
router.patch("/messages/seen", ...planGuard, markMessagesSeenController);

export default router;
