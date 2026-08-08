import { z } from "zod";

export const getReposSchema = z.object({
  query: z.object({
    username: z.string().min(1, "Username is required"),
    page: z.string().optional(),
    per_page: z.string().optional(),
  }),
});

export const getCommitsSchema = z.object({
  query: z.object({
    repo: z.string().min(1, "Repo name is required"),
    owner: z.string().min(1, "Owner is required"),
    page: z.string().optional(),
    per_page: z.string().optional(),
  }),
});
