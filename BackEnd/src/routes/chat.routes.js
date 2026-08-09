import { Router } from "express";

import {
  getChatController,
  listMessagesController,
  markMessagesSeenController,
  deleteMessageController,
  uploadChatImageController,
  pinMessageController,
  unpinMessageController,
} from "../controllers/chat.controller.js";
import { userAuth } from "../middlewares/auth.js";
import { requireMinimumPlan } from "../middlewares/requirePlan.js";
import upload from "../config/multer.js";
import validate from "../middlewares/validate.js";
import { uploadChatImageSchema } from "../validations/chat.validation.js";
import { userUploadLimiter, rateLimit } from "../middlewares/rateLimiter.js";

const router = Router();
const planGuard = [userAuth, requireMinimumPlan("silver")];

router.get("/chat/:targetUserId", ...planGuard, getChatController);
router.get("/messages/:matchId", ...planGuard, listMessagesController);
router.patch("/messages/seen", ...planGuard, markMessagesSeenController);
router.delete("/messages/:messageId", ...planGuard, deleteMessageController);
router.post("/chat/:chatId/pin", ...planGuard, pinMessageController);
router.delete("/chat/:chatId/pin", ...planGuard, unpinMessageController);
router.post(
  "/chat/upload",
  ...planGuard,
  rateLimit(userUploadLimiter, (req) => req.user._id.toString()),
  upload.single("image"),
  validate(uploadChatImageSchema),
  uploadChatImageController
);

export default router;
