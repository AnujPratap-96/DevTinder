import jwt from "jsonwebtoken";
import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import config from "../config/env.js";
import { findUserById } from "../repositories/user.repository.js";
import { AppError } from "../errors/index.js";
import {
  sendOtp,
  verifyOtp,
  resetPassword,
  initiateSignup,
  completeSignup,
  login,
  oauthLogin,
  logout,
  generateAndStoreRefreshToken,
  rotateRefreshToken,
} from "../services/auth.service.js";

const secureCookieFlags = (req) => {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
  };
};

const setAuthCookies = (req, res, { accessToken, refreshToken }) => {
  res.cookie("token", accessToken, {
    expires: new Date(Date.now() + 8 * 3600000),
    ...secureCookieFlags(req),
  });
  res.cookie("refreshToken", refreshToken, {
    expires: new Date(Date.now() + 7 * 24 * 3600000),
    ...secureCookieFlags(req),
  });
};

const clearAuthCookies = (req, res) => {
  res.cookie("token", "", { expires: new Date(0), ...secureCookieFlags(req) });
  res.cookie("refreshToken", "", { expires: new Date(0), ...secureCookieFlags(req) });
};

export const sendOtpController = asyncHandler(async (req, res) => {
  const { email, purpose } = req.body ?? {};
  await sendOtp({ email, purpose });
  return successResponse(res, { message: "OTP sent to your email!", data: { sent: true } });
});

export const verifyOtpController = asyncHandler(async (req, res) => {
  const { email, otp, purpose } = req.body ?? {};
  await verifyOtp({ email, otp, purpose });
  return successResponse(res, { message: "OTP verified successfully", data: { verified: true } });
});

export const resetPasswordController = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body ?? {};
  await resetPassword({ email, newPassword });
  return successResponse(res, { message: "Password reset successfully", data: { reset: true } });
});

export const registerController = asyncHandler(async (req, res) => {
  const { emailId } = req.body ?? {};
  const { token } = await initiateSignup({ emailId });

  res.cookie("signup_token", token, {
    expires: new Date(Date.now() + 60 * 60000),
    ...secureCookieFlags(req),
  });

  return successResponse(res, { message: "OTP sent to your email!", data: { token } });
});

export const completeSignupController = asyncHandler(async (req, res) => {
  const { emailId } = req;
  const { firstName, lastName, password, age, gender } = req.body ?? {};
  const { user, token } = await completeSignup({
    emailId,
    firstName,
    lastName,
    password,
    age,
    gender,
  });

  const refreshToken = await generateAndStoreRefreshToken(user);
  setAuthCookies(req, res, { accessToken: token, refreshToken });
  res.clearCookie("signup_token");

  return successResponse(res, { message: "User added successfully", data: { user } });
});

export const loginController = asyncHandler(async (req, res) => {
  const { emailId, password } = req.body ?? {};
  const { user, token } = await login({ emailId, password });

  const refreshToken = await generateAndStoreRefreshToken(user);
  setAuthCookies(req, res, { accessToken: token, refreshToken });

  return successResponse(res, { message: "User Logged In Successfully", data: { user } });
});

export const oauthLoginController = asyncHandler(async (req, res) => {
  const { provider, credential, code, accessToken } = req.body ?? {};
  const { user, token } = await oauthLogin({ provider, credential, code, accessToken });

  const refreshToken = await generateAndStoreRefreshToken(user);
  setAuthCookies(req, res, { accessToken: token, refreshToken });

  return successResponse(res, { message: "OAuth login successful", data: { user } });
});

export const refreshTokenController = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken;
  if (!incomingRefreshToken) {
    throw new AppError({ message: "Refresh token missing", statusCode: 401, errorCode: "REFRESH_TOKEN_MISSING" });
  }

  let payload;
  try {
    payload = await jwt.verify(incomingRefreshToken, config.jwt.refreshSecret);
  } catch {
    clearAuthCookies(req, res);
    throw new AppError({ message: "Refresh token expired", statusCode: 401, errorCode: "REFRESH_TOKEN_EXPIRED" });
  }

  const user = await findUserById(payload._id);
  if (!user || !user.refreshToken) {
    clearAuthCookies(req, res);
    throw new AppError({ message: "Refresh token invalid", statusCode: 401, errorCode: "REFRESH_TOKEN_INVALID" });
  }

  if (user.refreshToken !== incomingRefreshToken) {
    clearAuthCookies(req, res);
    throw new AppError({ message: "Refresh token reused", statusCode: 401, errorCode: "REFRESH_TOKEN_REUSED" });
  }

  const newAccessToken = await user.getJWT();
  const newRefreshToken = await rotateRefreshToken(user);
  setAuthCookies(req, res, { accessToken: newAccessToken, refreshToken: newRefreshToken });

  return successResponse(res, { message: "Token refreshed", data: { refreshed: true } });
});

export const logoutController = asyncHandler(async (req, res) => {
  await logout(req.user?._id);
  clearAuthCookies(req, res);
  return successResponse(res, { message: "User Logged Out Successfully", data: { loggedOut: true } });
});
