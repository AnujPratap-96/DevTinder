/**
 * enhancement.routes.js — Phase-1 chat enhancement endpoints (all additive).
 * Every route lives under /chat/enhance so it can never collide with
 * existing chat routes, and the whole module can be reverted as one unit.
 */
import { Router } from "express";
import multer from "multer";
import {
  uploadVoiceNoteController,
  searchMessagesController,
  togglePinMessageController,
  getChatPrefsController,
  setChatPrefController,
  reactToMessageController,
} from "./enhancement.controller.js";
import { userAuth } from "../middlewares/auth.js";
import { requireMinimumPlan } from "../middlewares/requirePlan.js";
import ENHANCEMENTS from "./enhancement.config.js";
import { ValidationError } from "../errors/index.js";

const router = Router();
const planGuard = [userAuth, requireMinimumPlan("silver")];

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ENHANCEMENTS.voiceNotes.maxFileSizeMb * 1024 * 1024 },
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
router.patch("/chat/enhance/messages/:messageId/pin", ...planGuard, togglePinMessageController);
router.get("/chat/enhance/prefs", ...planGuard, getChatPrefsController);
router.patch("/chat/enhance/prefs", ...planGuard, setChatPrefController);
router.post("/chat/enhance/messages/:messageId/react", ...planGuard, reactToMessageController);

export default router;
