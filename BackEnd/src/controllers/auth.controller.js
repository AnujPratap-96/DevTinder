import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import config from "../config/env.js";
import {
  sendOtp,
  verifyOtp,
  resetPassword,
  initiateSignup,
  completeSignup,
  login,
  oauthLogin,
  logout,
} from "../services/auth.service.js";

const secureCookieFlags = (req) => {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
  };
};

export const sendOtpController = asyncHandler(async (req, res) => {
  const { email, purpose } = req.body ?? {};
  await sendOtp({ email, purpose });
  return successResponse(res, { message: "OTP sent to your email!" });
});

export const verifyOtpController = asyncHandler(async (req, res) => {
  const { email, otp, purpose } = req.body ?? {};
  await verifyOtp({ email, otp, purpose });
  return successResponse(res, { message: "OTP verified successfully", data: { verified: true } });
});

export const resetPasswordController = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body ?? {};
  await resetPassword({ email, newPassword });
  return successResponse(res, { message: "Password reset successfully" });
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

  res.cookie("token", token, {
    expires: new Date(Date.now() + 8 * 3600000),
    ...secureCookieFlags(req),
  });
  res.clearCookie("signup_token");

  return successResponse(res, { message: "User added successfully" });
});

export const loginController = asyncHandler(async (req, res) => {
  const { emailId, password } = req.body ?? {};
  const { user, token } = await login({ emailId, password });

  res.cookie("token", token, {
    expires: new Date(Date.now() + 8 * 3600000),
    ...secureCookieFlags(req),
  });

  return successResponse(res, { message: "User Logged In Successfully", data: { user } });
});

export const oauthLoginController = asyncHandler(async (req, res) => {
  const { provider, credential, code, accessToken } = req.body ?? {};
  const { user, token } = await oauthLogin({ provider, credential, code, accessToken });

  res.cookie("token", token, {
    expires: new Date(Date.now() + 8 * 3600000),
    ...secureCookieFlags(req),
  });

  return successResponse(res, { message: "OAuth login successful", data: { user } });
});

export const logoutController = asyncHandler(async (req, res) => {
  await logout(req.user?._id);
  res.cookie("token", "", {
    expires: new Date(0),
    ...secureCookieFlags(req),
  });
  return successResponse(res, { message: "User Logged Out Successfully" });
});
