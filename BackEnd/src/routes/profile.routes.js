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
  updatePrivacyController, // [PHASE-3]
} from "../controllers/profile.controller.js";
import { userAuth } from "../middlewares/auth.js";
import upload from "../config/multer.js";
import validate from "../middlewares/validate.js";
import { editProfileSchema } from "../validations/user.validation.js";
import {
  changePasswordSchema,
  updateLocationSchema,
  updateAvailabilitySchema,
  updatePrivacySchema,
} from "../validations/profile.validation.js";
import SECURITY from "../security/security.config.js"; // [PHASE-3]

const router = Router();

router.get("/profile/view", userAuth, getProfileController);
router.patch(
  "/profile/edit",
  userAuth,
  validate(editProfileSchema),
  editProfileController
);
router.patch(
  "/profile/password",
  userAuth,
  validate(changePasswordSchema),
  changePasswordController
);
router.patch(
  "/profile/upload-image",
  userAuth,
  upload.single("image"),
  uploadImageController
);
router.patch(
  "/profile/location",
  userAuth,
  validate(updateLocationSchema),
  updateLocationController
);
router.patch(
  "/profile/availability",
  userAuth,
  validate(updateAvailabilitySchema),
  updateAvailabilityController
);
router.get("/profile/views", userAuth, getProfileViewsController);
router.post("/profile/view/:userId", userAuth, recordProfileViewController);
if (SECURITY.enabled && SECURITY.anonymizedBrowsing.enabled) {
  router.patch(
    "/profile/privacy",
    userAuth,
    validate(updatePrivacySchema),
    updatePrivacyController
  );
}
router.get("/profile/:userId", userAuth, getUserProfileController);

export default router;
