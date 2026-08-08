import { z } from "zod";

export const createPlanSchema = z.object({
  body: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes"),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    price: z.number().min(0).optional(),
    currency: z.string().optional(),
    durationMonths: z.number().min(0).optional(),
    features: z.array(z.string()).optional(),
    badgeLabel: z.string().optional(),
    accentColor: z.string().optional(),
    order: z.number().optional(),
    isFree: z.boolean().optional(),
    isActive: z.boolean().optional(),
    limits: z.object({
      connectionRequestsPerDay: z.number().nullable().optional(),
      aiCallsPerDay: z.number().nullable().optional(),
      invitesPerMonth: z.number().nullable().optional(),
      canCreateProjects: z.boolean().optional(),
      canChat: z.boolean().optional(),
      canCall: z.boolean().optional(),
      canVideoCall: z.boolean().optional(),
      canViewProfileViews: z.boolean().optional(),
      profileViewsLimit: z.number().int().nonnegative().nullable().optional(),
      blueBadge: z.boolean().optional(),
      themeAccess: z.boolean().optional(),
    }).optional(),
  }),
});

export const updatePlanSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.number().min(0).optional(),
    currency: z.string().optional(),
    durationMonths: z.number().min(0).optional(),
    features: z.array(z.string()).optional(),
    badgeLabel: z.string().optional(),
    accentColor: z.string().optional(),
    order: z.number().optional(),
    isFree: z.boolean().optional(),
    isActive: z.boolean().optional(),
    limits: z.object({
      connectionRequestsPerDay: z.number().nullable().optional(),
      aiCallsPerDay: z.number().nullable().optional(),
      invitesPerMonth: z.number().nullable().optional(),
      canCreateProjects: z.boolean().optional(),
      canChat: z.boolean().optional(),
      canCall: z.boolean().optional(),
      canVideoCall: z.boolean().optional(),
      canViewProfileViews: z.boolean().optional(),
      profileViewsLimit: z.number().int().nonnegative().nullable().optional(),
      blueBadge: z.boolean().optional(),
      themeAccess: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

export const planIdParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Plan ID is required"),
  }),
});
