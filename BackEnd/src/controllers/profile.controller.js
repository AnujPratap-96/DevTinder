import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getSelfProfile,
  updateProfile,
  changePassword,
  uploadProfileImage,
  updateLocation,
  updateAvailability,
  getProfileViews,
  recordProfileView,
  getUserProfile,
} from "../services/profile.service.js";

export const getProfileController = asyncHandler(async (req, res) => {
  const user = await getSelfProfile(req.user);
  return successResponse(res, { message: "Profile fetched successfully", data: { user } });
});

export const editProfileController = asyncHandler(async (req, res) => {
  const updatedUser = await updateProfile(req.user._id, req.body ?? {});
  return successResponse(res, {
    message: "Profile updated successfully",
    data: { user: updatedUser },
  });
});

export const changePasswordController = asyncHandler(async (req, res) => {
  const { oldpassword, newpassword } = req.body ?? {};
  await changePassword(req.user, { oldPassword: oldpassword, newPassword: newpassword });
  return successResponse(res, { message: "Password updated successfully" });
});

export const uploadImageController = asyncHandler(async (req, res) => {
  const { index } = req.body ?? {};
  const secureUrl = await uploadProfileImage(
    req.user,
    req.file,
    index !== undefined ? Number(index) : undefined
  );
  return successResponse(res, {
    message: "Image uploaded successfully",
    data: { secureUrl },
  });
});

export const updateLocationController = asyncHandler(async (req, res) => {
  await updateLocation(req.user, req.body ?? {});
  return successResponse(res, { message: "Location updated" });
});

export const updateAvailabilityController = asyncHandler(async (req, res) => {
  const { availability } = req.body ?? {};
  const value = await updateAvailability(req.user, availability);
  return successResponse(res, {
    message: "Availability updated",
    data: { availability: value },
  });
});

export const getProfileViewsController = asyncHandler(async (req, res) => {
  const views = await getProfileViews(req.user._id);
  return successResponse(res, { data: { views } });
});

export const recordProfileViewController = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await recordProfileView({ viewerId: req.user._id, viewedUserId: userId });
  return successResponse(res, { message: "View recorded", data: result });
});

export const getUserProfileController = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const profile = await getUserProfile({ userId, viewerId: req.user._id });
  return successResponse(res, { data: { profile } });
});
