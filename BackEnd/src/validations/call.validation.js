import { z } from "zod";

export const createCallSchema = z.object({
  body: z.object({
    calleeId: z.string().min(1, "Callee ID is required"),
    callType: z.enum(["audio", "video"], {
      errorMap: () => ({ message: "Call type must be audio or video" }),
    }),
  }),
});

export const callActionSchema = z.object({
  body: z.object({
    callId: z.string().min(1, "Call ID is required"),
  }),
});
