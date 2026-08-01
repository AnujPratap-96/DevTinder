import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  sendOtpController,
  verifyOtpController,
  resetPasswordController,
  registerController,
  completeSignupController,
  loginController,
  oauthLoginController,
  refreshTokenController,
  logoutController,
} from "../controllers/auth.controller.js";
import { verifySignJWT } from "../middlewares/signupauth.js";
import validate from "../middlewares/validate.js";
import { signupSchema, loginSchema } from "../validations/user.validation.js";
import {
  sendOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  registerSchema,
  oauthLoginSchema,
} from "../validations/auth.validation.js";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many requests from this IP, please try again later." },
});

const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many OTP requests. Please try again later." },
  keyGenerator: (req) => req.body?.email ?? req.body?.emailId ?? 'unknown',
});

const router = Router();

router.post("/send-otp", otpRateLimiter, validate(sendOtpSchema), sendOtpController);
router.post("/verify-otp", authLimiter, validate(verifyOtpSchema), verifyOtpController);
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), resetPasswordController);

router.post("/register", authLimiter, validate(registerSchema), registerController);
router.post(
  "/complete-signup",
  authLimiter,
  verifySignJWT,
  validate(signupSchema),
  completeSignupController
);

router.post("/login", authLimiter, validate(loginSchema), loginController);
router.post("/auth/oauth", authLimiter, validate(oauthLoginSchema), oauthLoginController);
router.post("/refresh-token", authLimiter, refreshTokenController);
router.post("/logout", authLimiter, logoutController);

export default router;
