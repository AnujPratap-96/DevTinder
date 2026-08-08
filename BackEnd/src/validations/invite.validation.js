import { z } from "zod";

export const createInviteSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    name: z.string().optional(),
    message: z.string().max(500).optional(),
  }),
});

export const cancelInviteParamsSchema = z.object({
  params: z.object({
    inviteId: z.string().min(1, "Invite ID is required"),
  }),
});
