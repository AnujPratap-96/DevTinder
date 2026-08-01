import { z } from "zod";

export const changePasswordSchema = z.object({
  body: z.object({
    oldpassword: z.string().min(1, "Old password is required"),
    newpassword: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  }),
});

export const updateLocationSchema = z.object({
  body: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    city: z.string().optional(),
    country: z.string().optional(),
  }),
});

export const updateAvailabilitySchema = z.object({
  body: z.object({
    availability: z.enum(["open", "busy", "not_looking"]),
  }),
});
