import { Router } from "express";

import {
  getChatController,
  listMessagesController,
  markMessagesSeenController,
  deleteMessageController,
  uploadChatImageController,
} from "../controllers/chat.controller.js";
import { userAuth } from "../middlewares/auth.js";
import { requireMinimumPlan } from "../middlewares/requirePlan.js";
import upload from "../config/multer.js";
import validate from "../middlewares/validate.js";
import { uploadChatImageSchema } from "../validations/chat.validation.js";

const router = Router();
const planGuard = [userAuth, requireMinimumPlan("silver")];

router.get("/chat/:targetUserId", ...planGuard, getChatController);
router.get("/messages/:matchId", ...planGuard, listMessagesController);
router.patch("/messages/seen", ...planGuard, markMessagesSeenController);
router.delete("/messages/:messageId", ...planGuard, deleteMessageController);
router.post(
  "/chat/upload",
  ...planGuard,
  upload.single("image"),
  validate(uploadChatImageSchema),
  uploadChatImageController
);

export default router;
