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
  verifyTwoFactorLogin,
  oauthLogin,
  logout,
  generateAndStoreRefreshToken,
  rotateRefreshToken,
} from "../services/auth.service.js";
import * as twoFactorService from "../security/twoFactor.service.js"; // [PHASE-3]
import * as sessionService from "../security/session.service.js"; // [PHASE-3]
import logger from "../utils/logger.js";

const secureCookieFlags = (req) => {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure: isHttps,
    // Frontend (Vercel) and API (Render) are cross-site; partition the cookie
    // to the frontend's top-level site so Chrome's third-party cookie blocking
    // does not drop it (works in incognito too).
    partitioned: true,
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

// [PHASE-3] Best-effort device label from the User-Agent header.
const describeDevice = (req) => {
  const ua = req.headers["user-agent"] ?? "";
  let device = "Unknown device";
  if (/mobile|android|iphone|ipad/i.test(ua)) device = "Mobile";
  else if (/windows/i.test(ua)) device = "Windows";
  else if (/macintosh|mac os/i.test(ua)) device = "macOS";
  else if (/linux/i.test(ua)) device = "Linux";
  const browser = /edg\//i.test(ua) ? "Edge"
    : /chrome|crios/i.test(ua) ? "Chrome"
    : /firefox/i.test(ua) ? "Firefox"
    : /safari/i.test(ua) ? "Safari"
    : "";
  return browser ? `${device} · ${browser}` : device;
};

const recordSession = async (req, userId, refreshToken) => {
  try {
    await sessionService.createSession({
      userId,
      refreshToken,
      device: describeDevice(req),
      ip: req.ip ?? req.socket?.remoteAddress ?? "",
    });
  } catch (error) {
    logger.warn("Failed to record session", error);
  }
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
  await recordSession(req, user._id, refreshToken); // [PHASE-3]

  return successResponse(res, { message: "User added successfully", data: { user } });
});

export const loginController = asyncHandler(async (req, res) => {
  const { emailId, password } = req.body ?? {};
  const { user, token, twoFactorRequired, tempToken } = await login({ emailId, password });

  // [PHASE-3] Two-factor challenge: no session/cookies yet, just a temp token.
  if (twoFactorRequired) {
    return successResponse(res, {
      message: "Two-factor code required",
      data: { twoFactorRequired: true, tempToken },
    });
  }

  const refreshToken = await generateAndStoreRefreshToken(user);
  setAuthCookies(req, res, { accessToken: token, refreshToken });
  await recordSession(req, user._id, refreshToken); // [PHASE-3]

  return successResponse(res, { message: "User Logged In Successfully", data: { user } });
});

export const verifyTwoFactorLoginController = asyncHandler(async (req, res) => {
  const { tempToken, token } = req.body ?? {};
  const { user, token: accessToken } = await verifyTwoFactorLogin({ tempToken, token });

  const refreshToken = await generateAndStoreRefreshToken(user);
  setAuthCookies(req, res, { accessToken, refreshToken });
  await recordSession(req, user._id, refreshToken); // [PHASE-3]

  return successResponse(res, { message: "Login successful", data: { user } });
});

export const oauthLoginController = asyncHandler(async (req, res) => {
  const { provider, credential, code, accessToken } = req.body ?? {};
  const { user, token } = await oauthLogin({ provider, credential, code, accessToken });

  const refreshToken = await generateAndStoreRefreshToken(user);
  setAuthCookies(req, res, { accessToken: token, refreshToken });
  await recordSession(req, user._id, refreshToken); // [PHASE-3]

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

  // [PHASE-3] Session-backed rotation: the refresh token must belong to a
  // live session record, so revoking a device also kills its refresh token.
  const session = await sessionService.findSessionByRefreshToken(incomingRefreshToken);
  const user = await findUserById(payload._id);
  if (!user) {
    clearAuthCookies(req, res);
    throw new AppError({ message: "Refresh token invalid", statusCode: 401, errorCode: "REFRESH_TOKEN_INVALID" });
  }

  if (session) {
    const newAccessToken = await user.getJWT();
    const newRefreshToken = await rotateRefreshToken(user);
    await sessionService.rotateSessionToken(session._id, newRefreshToken);
    setAuthCookies(req, res, { accessToken: newAccessToken, refreshToken: newRefreshToken });
    return successResponse(res, { message: "Token refreshed", data: { refreshed: true } });
  }

  // Legacy fallback (no session records — sessions disabled): keep the
  // original single-refresh-token behavior.
  if (!user.refreshToken) {
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
  // [PHASE-3] Kill the current device's session record too.
  await sessionService.revokeCurrentSession({
    userId: req.user?._id,
    refreshToken: req.cookies.refreshToken,
  });
  await logout(req.user?._id);
  clearAuthCookies(req, res);
  return successResponse(res, { message: "User Logged Out Successfully", data: { loggedOut: true } });
});

// ── [PHASE-3] two-factor controllers ─────────────────────────────────────

export const setup2faController = asyncHandler(async (req, res) => {
  const data = await twoFactorService.startSetup({
    userId: req.user._id,
    emailId: req.user.emailId,
  });
  return successResponse(res, { message: "2FA setup started", data });
});

export const enable2faController = asyncHandler(async (req, res) => {
  const { token } = req.body ?? {};
  const data = await twoFactorService.enable({ userId: req.user._id, token });
  return successResponse(res, { message: "Two-factor authentication enabled", data });
});

export const disable2faController = asyncHandler(async (req, res) => {
  const { token } = req.body ?? {};
  const data = await twoFactorService.disable({ userId: req.user._id, token });
  return successResponse(res, { message: "Two-factor authentication disabled", data });
});

// ── [PHASE-3] session controllers ────────────────────────────────────────

export const getSessionsController = asyncHandler(async (req, res) => {
  const { sessions } = await sessionService.listSessions(req.user._id);
  const current = await sessionService.findSessionByRefreshToken(req.cookies.refreshToken);
  return successResponse(res, {
    message: "Sessions fetched successfully",
    data: { sessions, currentSessionId: current?._id ?? null },
  });
});

export const revokeSessionController = asyncHandler(async (req, res) => {
  const { sessionId } = req.body ?? {};
  const result = await sessionService.revokeSession({
    userId: req.user._id,
    sessionId,
    currentRefreshToken: req.cookies.refreshToken,
  });

  // If the revoked session is the one currently in use, log it out server-side.
  if (result.wasCurrent) {
    await logout(req.user._id);
  }
  return successResponse(res, {
    message: result.revoked ? "Session revoked successfully" : "Session not found",
    data: { revoked: result.revoked },
  });
});
