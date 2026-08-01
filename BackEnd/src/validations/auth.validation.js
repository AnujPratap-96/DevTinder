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
