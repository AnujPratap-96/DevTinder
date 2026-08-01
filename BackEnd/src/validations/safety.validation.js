import { z } from "zod";

export const blockUserSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "Target user ID is required"),
  }),
});

export const reportUserSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "Reported user ID is required"),
    reason: z.string().min(1, "Reason is required").max(500),
    details: z.string().max(2000).optional(),
  }),
});
