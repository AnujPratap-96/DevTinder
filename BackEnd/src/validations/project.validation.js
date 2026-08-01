import { z } from "zod";

export const createProjectSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().min(1, "Description is required").max(5000),
    techStack: z.array(z.string()).optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(5000).optional(),
    techStack: z.array(z.string()).optional(),
    status: z.enum(["open", "in_progress", "completed"]).optional(),
  }),
});

export const requestJoinSchema = z.object({
  body: z.object({
    projectId: z.string().min(1, "Project ID is required"),
  }),
});

export const respondToRequestSchema = z.object({
  body: z.object({
    projectId: z.string().min(1, "Project ID is required"),
    requestId: z.string().min(1, "Request ID is required"),
    action: z.enum(["accept", "reject"], {
      errorMap: () => ({ message: "Action must be accept or reject" }),
    }),
  }),
});

export const addProjectMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1, "Message is required").max(5000),
    mentions: z.array(z.string()).optional(),
  }),
});
