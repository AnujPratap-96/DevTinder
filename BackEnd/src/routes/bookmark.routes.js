import { Router } from "express";

import { createBookmarkController, listBookmarksController } from "../controllers/bookmark.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/bookmark", userAuth, createBookmarkController);
router.get("/bookmarks", userAuth, listBookmarksController);

export default router;
