import { Router } from "express";

import {
  getProfileController,
  editProfileController,
  changePasswordController,
  uploadImageController,
  updateLocationController,
  updateAvailabilityController,
  getProfileViewsController,
  recordProfileViewController,
  getUserProfileController,
} from "../controllers/profile.controller.js";
import { userAuth } from "../middlewares/auth.js";
import upload from "../config/multer.js";
import validate from "../middlewares/validate.js";
import { editProfileSchema } from "../validations/user.validation.js";

const router = Router();

router.get("/profile/view", userAuth, getProfileController);
router.patch(
  "/profile/edit",
  userAuth,
  validate(editProfileSchema),
  editProfileController
);
router.patch("/profile/password", userAuth, changePasswordController);
router.patch(
  "/profile/upload-image",
  userAuth,
  upload.single("image"),
  uploadImageController
);
router.patch("/profile/location", userAuth, updateLocationController);
router.patch("/profile/availability", userAuth, updateAvailabilityController);
router.get("/profile/views", userAuth, getProfileViewsController);
router.post("/profile/view/:userId", userAuth, recordProfileViewController);
router.get("/profile/:userId", userAuth, getUserProfileController);

export default router;
