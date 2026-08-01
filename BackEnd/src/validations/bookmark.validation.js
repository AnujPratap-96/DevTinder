import { z } from "zod";

export const addBookmarkSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User ID to bookmark is required"),
  }),
});
