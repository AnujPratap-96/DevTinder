import { z } from "zod";

const emailField = z.string().email("Invalid email format");

export const sendOtpSchema = z.object({
  body: z.object({
    email: emailField,
    purpose: z.enum(["signup", "login", "reset-password"], {
      errorMap: () => ({ message: "Purpose must be signup, login, or reset-password" }),
    }),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: emailField,
    otp: z.string().length(6, "OTP must be 6 digits"),
    purpose: z.enum(["signup", "login", "reset-password"]),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: emailField,
    newPassword: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    emailId: emailField,
  }),
});

export const oauthLoginSchema = z.object({
  body: z.object({
    provider: z.enum(["google", "github"], {
      errorMap: () => ({ message: "Provider must be google or github" }),
    }),
    credential: z.string().optional(),
    code: z.string().optional(),
    accessToken: z.string().optional(),
  }),
});

// [PHASE-3] two-factor & session management schemas
const totpCode = z.string().length(6, "Code must be 6 digits").regex(/^\d{6}$/, "Code must be numeric");

export const enable2faSchema = z.object({
  body: z.object({ token: totpCode }),
});

export const disable2faSchema = z.object({
  body: z.object({ token: totpCode }),
});

export const verify2faLoginSchema = z.object({
  body: z.object({
    tempToken: z.string().min(1, "tempToken is required"),
    token: totpCode,
  }),
});

export const revokeSessionSchema = z.object({
  body: z.object({
    sessionId: z.string().min(1, "sessionId is required"),
  }),
});
