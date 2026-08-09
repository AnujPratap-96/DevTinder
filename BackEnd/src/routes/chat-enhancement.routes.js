import { Router } from "express";
import multer from "multer";
import {
  uploadVoiceNoteController,
  searchMessagesController,
  getChatPrefsController,
  setChatPrefController,
  reactToMessageController,
} from "../controllers/chat-enhancement.controller.js";
import { userAuth } from "../middlewares/auth.js";
import { requireMinimumPlan } from "../middlewares/requirePlan.js";
import FEATURES from "../config/features.js";
import { ValidationError } from "../errors/index.js";

const router = Router();
const planGuard = [userAuth, requireMinimumPlan("silver")];

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FEATURES.voiceNotes.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^audio\//.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError("Only audio files are allowed"), false);
    }
  },
});

router.post(
  "/chat/enhance/voice-note",
  ...planGuard,
  audioUpload.single("audio"),
  uploadVoiceNoteController
);
router.get("/chat/enhance/messages/search", ...planGuard, searchMessagesController);
router.get("/chat/enhance/prefs", ...planGuard, getChatPrefsController);
router.patch("/chat/enhance/prefs", ...planGuard, setChatPrefController);
router.post("/chat/enhance/messages/:messageId/react", ...planGuard, reactToMessageController);

export default router;
