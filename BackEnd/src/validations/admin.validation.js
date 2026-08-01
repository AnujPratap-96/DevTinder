import { z } from "zod";

export const banUserSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});

export const resolveReportSchema = z.object({
  body: z.object({
    status: z.enum(["open", "reviewing", "resolved"], {
      errorMap: () => ({ message: "Status must be open, reviewing, or resolved" }),
    }),
  }),
  params: z.object({
    id: z.string().min(1, "Report ID is required"),
  }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    limit: z.string().optional(),
    cursor: z.string().optional(),
    search: z.string().optional(),
    role: z.string().optional(),
    availability: z.string().optional(),
    banned: z.enum(["true", "false"]).optional(),
  }),
});

export const userIdParamsSchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});
