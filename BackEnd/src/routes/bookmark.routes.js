import { Router } from "express";

import {
  createBookmarkController,
  listBookmarksController,
  deleteBookmarkController,
} from "../controllers/bookmark.controller.js";
import { userAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { addBookmarkSchema } from "../validations/bookmark.validation.js";

const router = Router();

router.post(
  "/bookmark",
  userAuth,
  validate(addBookmarkSchema),
  createBookmarkController
);
router.get("/bookmarks", userAuth, listBookmarksController);
router.delete("/bookmark/:userId", userAuth, deleteBookmarkController);

export default router;
