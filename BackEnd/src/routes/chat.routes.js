import { Router } from "express";

import {
  getChatController,
  listMessagesController,
  markMessagesSeenController,
} from "../controllers/chat.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/chat/:targetUserId", userAuth, getChatController);
router.get("/messages/:matchId", userAuth, listMessagesController);
router.patch("/messages/seen", userAuth, markMessagesSeenController);

export default router;
