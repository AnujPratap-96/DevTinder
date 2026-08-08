import bcrypt from "bcrypt";
import validator from "validator";

import {
  findUserById,
  updateUserById,
} from "../repositories/user.repository.js";
import * as profileViewRepo from "../repositories/profileView.repository.js";
import uploadImageCloudinary from "../utils/cloudinary.js";
import { AppError, ValidationError } from "../errors/index.js";
import SECURITY from "../security/security.config.js"; // [PHASE-3]

export const getSelfProfile = async (user) => {
  user.calculateProfileStrength();
  await user.save();
  return user;
};

export const updateProfile = async (userId, payload) => {
  const updated = await updateUserById(
    userId,
    payload,
    { runValidators: true, returnDocument: "after" }
  );
  if (!updated) {
    throw new AppError({ message: "User not found", statusCode: 404 });
  }
  updated.calculateProfileStrength();
  await updated.save();
  return updated;
};

export const changePassword = async (user, { oldPassword, newPassword }) => {
  if (!oldPassword || !newPassword) {
    throw new ValidationError("Old password and new password are required");
  }
  if (oldPassword === newPassword) {
    throw new ValidationError("Old password and new password cannot be same");
  }
  const isValid = await user.validatePassword(oldPassword);
  if (!isValid) {
    throw new ValidationError("Invalid password");
  }
  if (!validator.isStrongPassword(newPassword)) {
    throw new ValidationError("Password is not strong enough");
  }
  const hash = await bcrypt.hash(newPassword, 10);
  user.password = hash;
  await user.save();
};

export const uploadProfileImage = async (user, file, index) => {
  if (!file) {
    throw new ValidationError("Image file is required");
  }
  const uploadResponse = await uploadImageCloudinary(file);
  if (!uploadResponse || uploadResponse.error) {
    throw new AppError({
      message: uploadResponse?.message || "Error uploading image",
      statusCode: 400,
    });
  }

  if (index !== undefined && user.photoUrl?.[index]) {
    user.photoUrl[index] = uploadResponse.secure_url;
  } else {
    user.photoUrl = user.photoUrl || [];
    user.photoUrl.push(uploadResponse.secure_url);
  }
  await user.save();
  return uploadResponse.secure_url;
};

export const updateLocation = async (user, { lat, lng, city, country }) => {
  if (
    lat === undefined ||
    lng === undefined ||
    Number.isNaN(Number(lat)) ||
    Number.isNaN(Number(lng))
  ) {
    throw new ValidationError("lat and lng are required");
  }
  user.location = {
    type: "Point",
    coordinates: [Number(lng), Number(lat)],
    city,
    country,
  };
  await user.save();
};

export const updateAvailability = async (user, availability) => {
  if (!availability || !["open", "busy", "not_looking"].includes(availability)) {
    throw new ValidationError("Invalid availability value");
  }
  user.availability = availability;
  await user.save();
  return availability;
};

export const getProfileViews = async (userId, { limit = 20, cursor = null } = {}, planLimit = null) => {
  const totalViews = await profileViewRepo.countViewsByViewedUserId(userId);

  if (planLimit === 0) {
    return { views: [], totalViews, nextCursor: null, hasMore: false, profileViewsLimit: 0 };
  }

  let effectiveLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  if (typeof planLimit === "number" && planLimit > 0) {
    const servedBefore = cursor ? await profileViewRepo.countViewsBefore(userId, cursor) : 0;
    const remaining = planLimit - servedBefore;
    if (remaining <= 0) {
      return { views: [], totalViews, nextCursor: null, hasMore: false, profileViewsLimit: planLimit };
    }
    effectiveLimit = Math.min(effectiveLimit, remaining);
  }

  const { views, nextCursor, hasMore } = await profileViewRepo.findViewsByViewedUserId(userId, {
    limit: effectiveLimit,
    cursor,
  });
  return { views, nextCursor, hasMore, totalViews, profileViewsLimit: planLimit ?? null };
};

export const recordProfileView = async ({ viewerId, viewedUserId, anonymize = false }) => {
  if (viewerId.toString() === viewedUserId.toString()) {
    return { recorded: false };
  }
  // [PHASE-3] anonymized browsing: the viewer opted out of being recorded.
  if (SECURITY.enabled && SECURITY.anonymizedBrowsing.enabled && anonymize) {
    return { recorded: false, anonymized: true };
  }
  await profileViewRepo.upsertProfileView(viewerId, viewedUserId);
  return { recorded: true };
};

export const updatePrivacy = async ({ userId, hideProfileViews }) => {
  const updated = await updateUserById(
    userId,
    { $set: { "privacy.hideProfileViews": Boolean(hideProfileViews) } },
    { runValidators: true, returnDocument: "after" }
  );
  if (!updated) {
    throw new AppError({ message: "User not found", statusCode: 404 });
  }
  return { hideProfileViews: updated.privacy?.hideProfileViews ?? false };
};

export const getUserProfile = async ({ userId, viewerId, viewer }) => {
  if (userId === viewerId.toString()) {
    throw new ValidationError("Use /profile/view for self");
  }

  const profile = await findUserById(userId).select("-password");
  if (!profile) {
    throw new AppError({ message: "Profile not found", statusCode: 404 });
  }

  // [PHASE-3] anonymized browsing: skip recording when the viewer has the
  // privacy toggle on.
  const anonymize =
    SECURITY.enabled &&
    SECURITY.anonymizedBrowsing.enabled &&
    !!viewer?.privacy?.hideProfileViews;
  if (!anonymize) {
    await profileViewRepo.upsertProfileView(viewerId, userId);
  }
  return profile;
};
