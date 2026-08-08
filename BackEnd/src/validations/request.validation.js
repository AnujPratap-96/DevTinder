import { z } from "zod";

export const sendRequestParamsSchema = z.object({
  params: z.object({
    status: z.enum(["ignored", "interested"], {
      errorMap: () => ({ message: "Status must be ignored or interested" }),
    }),
    touserId: z.string().min(1, "Target user ID is required"),
  }),
});

export const reviewRequestParamsSchema = z.object({
  params: z.object({
    status: z.enum(["accepted", "rejected"], {
      errorMap: () => ({ message: "Status must be accepted or rejected" }),
    }),
    requestId: z.string().min(1, "Request ID is required"),
  }),
});
