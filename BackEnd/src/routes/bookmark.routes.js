import { Router } from "express";

import {
  createBookmarkController,
  listBookmarksController,
  deleteBookmarkController,
} from "../controllers/bookmark.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/bookmark", userAuth, createBookmarkController);
router.get("/bookmarks", userAuth, listBookmarksController);
router.delete("/bookmark/:userId", userAuth, deleteBookmarkController);

export default router;
