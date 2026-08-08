import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  sendOtpController,
  verifyOtpController,
  resetPasswordController,
  registerController,
  completeSignupController,
  loginController,
  verifyTwoFactorLoginController,
  oauthLoginController,
  refreshTokenController,
  logoutController,
  setup2faController,
  enable2faController,
  disable2faController,
  getSessionsController,
  revokeSessionController,
} from "../controllers/auth.controller.js";
import { verifySignJWT } from "../middlewares/signupauth.js";
import { userAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { signupSchema, loginSchema } from "../validations/user.validation.js";
import {
  sendOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  registerSchema,
  oauthLoginSchema,
  enable2faSchema,
  disable2faSchema,
  verify2faLoginSchema,
  revokeSessionSchema,
} from "../validations/auth.validation.js";
import SECURITY from "../security/security.config.js"; // [PHASE-3]

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

// [PHASE-3] two-factor & active session management (flag-gated)
if (SECURITY.enabled && SECURITY.twoFactor.enabled) {
  router.post("/auth/2fa/verify-login", authLimiter, validate(verify2faLoginSchema), verifyTwoFactorLoginController);
  router.post("/auth/2fa/setup", userAuth, setup2faController);
  router.post("/auth/2fa/enable", userAuth, validate(enable2faSchema), enable2faController);
  router.post("/auth/2fa/disable", userAuth, validate(disable2faSchema), disable2faController);
}
if (SECURITY.enabled && SECURITY.sessions.enabled) {
  router.get("/auth/sessions", userAuth, getSessionsController);
  router.post("/auth/sessions/revoke", userAuth, validate(revokeSessionSchema), revokeSessionController);
}

export default router;
