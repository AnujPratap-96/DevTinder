import { z } from "zod";

export const createPaymentSchema = z.object({
  body: z.object({
    membershipType: z.string().min(1, "Membership type is required"),
  }),
});
