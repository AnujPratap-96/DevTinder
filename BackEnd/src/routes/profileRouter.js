const express = require("express");
const { userAuth } = require("../middlewares/auth");
const { validateEditProfileData } = require("../utils/validation");
const validator = require("validator");
const bcrypt = require("bcrypt");
const upload = require("../config/multer");
const uploadImageCloudinary = require("../utils/cloudinary");
const asyncHandler = require("express-async-handler");
const User = require("../models/user");
const ProfileView = require("../models/profileView");
const profileRouter = express.Router();

profileRouter.get("/profile/view", userAuth, asyncHandler(async (req, res) => {
    const user = req.user;
    user.calculateProfileStrength();
    await user.save();
    res.status(200).json({
      message: "Profile fetched successfully",
      user,
    });
}));

profileRouter.patch(
  "/profile/edit",
  userAuth,
  validateEditProfileData,
  asyncHandler(async (req, res) => {
      const loggedInUser = req.user;
      
      const updatedUser = await User.findByIdAndUpdate(
        loggedInUser._id,
        req.body,
        { runValidators: true, returnDocument: "after" }
      );

      updatedUser.calculateProfileStrength();
      await updatedUser.save();

      res
        .status(200)
        .json({ message: "Profile updated successfully", user: updatedUser });
  })
);

profileRouter.patch("/profile/password", userAuth, asyncHandler(async (req, res) => {
    const loggedInUser = req.user;
    const { oldpassword, newpassword } = req.body;
    if (oldpassword === newpassword) {
      return res.status(400).json({
        ERROR: "Old password and new password cannot be same",
      });
    }
    const isValidPassword = await loggedInUser.validatePassword(oldpassword);
    if (!isValidPassword) {
      return res.status(400).json({
        ERROR: "Invalid password",
      });
    }
    const isStrongPassword = validator.isStrongPassword(newpassword);
    if (!isStrongPassword) {
      return res.status(400).json({
        ERROR: "Password is not strong enough",
      });
    }
    const hashedPassword = await bcrypt.hash(newpassword, 10);
    loggedInUser.password = hashedPassword;
    await loggedInUser.save();
    res.json({
      message: "Password updated successfully",
    });
}));

profileRouter.patch(
  "/profile/upload-image",
  userAuth,
  upload.single("image"),
  asyncHandler(async (req, res) => {
      const image = req.file;
      const { index } = req.body;

      if (!image) {
        return res.status(400).json({
          message: "Image file is required",
        });
      }

      const uploadImage = await uploadImageCloudinary(image);
      if (!uploadImage || uploadImage.error) {
        return res.status(400).json({
          message: uploadImage?.message || "Error uploading image",
        });
      }
      const user = req.user;
      if(user.photoUrl[index]){
        user.photoUrl[index] = uploadImage.secure_url;
      }
      else{
        user.photoUrl.push(uploadImage.secure_url);
      }
      await user.save();

      res.status(200).json({
        message: "Image uploaded successfully",
        secure_url: uploadImage.secure_url,
      });
  })
);

profileRouter.patch(
  "/profile/location",
  userAuth,
  asyncHandler(async (req, res) => {
    const { lat, lng, city, country } = req.body ?? {};
    if (
      lat === undefined ||
      lng === undefined ||
      Number.isNaN(Number(lat)) ||
      Number.isNaN(Number(lng))
    ) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const user = req.user;
    user.location = {
      type: "Point",
      coordinates: [Number(lng), Number(lat)],
      city,
      country,
    };
    await user.save();
    res.status(200).json({ message: "Location updated" });
  })
);

profileRouter.patch(
  "/profile/availability",
  userAuth,
  asyncHandler(async (req, res) => {
    const { availability } = req.body ?? {};
    if (!availability || !["open", "busy", "not_looking"].includes(availability)) {
      return res.status(400).json({ message: "Invalid availability" });
    }
    const user = req.user;
    user.availability = availability;
    await user.save();
    res.status(200).json({ message: "Availability updated", availability });
  })
);

profileRouter.get(
  "/profile/views",
  userAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const views = await ProfileView.find({ viewedUserId: userId })
      .populate("viewerId", "firstName lastName photoUrl role")
      .sort({ viewedAt: -1 })
      .limit(100)
      .lean();
    res.status(200).json({ views });
  })
);

// Record a profile view
profileRouter.post(
  "/profile/view/:userId",
  userAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const viewerId = req.user._id;

    if (userId === viewerId.toString()) {
      return res.status(200).json({ message: "Self view not recorded" });
    }

    await ProfileView.findOneAndUpdate(
      { viewerId, viewedUserId: userId },
      { viewedAt: new Date() },
      { upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: "View recorded" });
  })
);

profileRouter.get(
  "/profile/:userId",
  userAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const viewerId = req.user._id;

    if (userId === viewerId.toString()) {
      return res.status(400).json({ message: "Use /profile/view for self" });
    }

    const profile = await User.findById(userId).select("-password");
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    await ProfileView.findOneAndUpdate(
      { viewerId, viewedUserId: userId },
      { viewedAt: new Date() },
      { upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ profile });
  })
);

module.exports = profileRouter;
