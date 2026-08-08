import { Router } from "express";

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
import { authLimiter, otpLimiter, rateLimit } from "../middlewares/rateLimiter.js";

const authByIp = rateLimit(authLimiter, (req) => req.ip);
const otpByEmail = rateLimit(otpLimiter, (req) => req.body?.email ?? req.body?.emailId ?? "unknown");

const router = Router();

router.post("/send-otp", otpByEmail, validate(sendOtpSchema), sendOtpController);
router.post("/verify-otp", authByIp, validate(verifyOtpSchema), verifyOtpController);
router.post("/reset-password", authByIp, validate(resetPasswordSchema), resetPasswordController);

router.post("/register", authByIp, validate(registerSchema), registerController);
router.post(
  "/complete-signup",
  authByIp,
  verifySignJWT,
  validate(signupSchema),
  completeSignupController
);

router.post("/login", authByIp, validate(loginSchema), loginController);
router.post("/auth/oauth", authByIp, validate(oauthLoginSchema), oauthLoginController);
router.post("/refresh-token", authByIp, refreshTokenController);
router.post("/logout", authByIp, logoutController);

// [PHASE-3] two-factor & active session management (flag-gated)
if (SECURITY.enabled && SECURITY.twoFactor.enabled) {
  router.post("/auth/2fa/verify-login", authByIp, validate(verify2faLoginSchema), verifyTwoFactorLoginController);
  router.post("/auth/2fa/setup", userAuth, setup2faController);
  router.post("/auth/2fa/enable", userAuth, validate(enable2faSchema), enable2faController);
  router.post("/auth/2fa/disable", userAuth, validate(disable2faSchema), disable2faController);
}
if (SECURITY.enabled && SECURITY.sessions.enabled) {
  router.get("/auth/sessions", userAuth, getSessionsController);
  router.post("/auth/sessions/revoke", userAuth, validate(revokeSessionSchema), revokeSessionController);
}

export default router;
