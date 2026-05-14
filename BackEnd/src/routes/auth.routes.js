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
  logoutController,
} from "../controllers/auth.controller.js";
import { verifySignJWT } from "../middlewares/signupauth.js";
import validate from "../middlewares/validate.js";
import { signupSchema, loginSchema } from "../validations/user.validation.js";

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

router.post("/send-otp", otpRateLimiter, sendOtpController);
router.post("/verify-otp", authLimiter, verifyOtpController);
router.post("/reset-password", authLimiter, resetPasswordController);

router.post("/register", authLimiter, registerController);
router.post(
  "/complete-signup",
  authLimiter,
  verifySignJWT,
  validate(signupSchema),
  completeSignupController
);

router.post("/login", authLimiter, validate(loginSchema), loginController);
router.post("/auth/oauth", authLimiter, oauthLoginController);
router.post("/logout", authLimiter, logoutController);

export default router;
