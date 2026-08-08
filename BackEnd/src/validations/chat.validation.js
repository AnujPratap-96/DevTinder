import { z } from "zod";

export const uploadChatImageSchema = z.object({
  body: z.object({
    matchId: z.string().min(1, "matchId is required"),
    targetUserId: z.string().min(1, "targetUserId is required"),
  }),
});
