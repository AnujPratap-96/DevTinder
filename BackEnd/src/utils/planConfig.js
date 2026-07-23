import Plan from "../models/plan.js";

const cache = new Map(); // slug -> { plan, expiresAt }
const CACHE_TTL_MS = 60 * 1000;

const getFromCache = (slug) => {
  const entry = cache.get(slug);
  if (entry && entry.expiresAt > Date.now()) return entry.plan;
  return null;
};

const setInCache = (slug, plan) => {
  if (plan) cache.set(slug, { plan, expiresAt: Date.now() + CACHE_TTL_MS });
};

export const getPlanBySlug = async (slug) => {
  if (!slug) return null;
  const cached = getFromCache(slug);
  if (cached) return cached;
  const plan = await Plan.findOne({ slug });
  setInCache(slug, plan);
  return plan;
};

export const getActivePlans = async () => {
  return Plan.find({ isActive: true }).sort({ order: 1 }).lean();
};

const FALLBACK_LIMITS = {
  connectionRequestsPerDay: 0,
  aiCallsPerDay: 0,
  invitesPerMonth: 0,
  canCreateProjects: false,
  canChat: false,
  canCall: false,
  canVideoCall: false,
  canViewProfileViews: false,
  blueBadge: false,
  themeAccess: false,
};

// Canonical limits per slug, defined in code so plan-gating works even when a
// DB plan is missing these fields (e.g. plans seeded before limits existed).
// DB plan.limits always wins over these defaults (admin edits are respected).
const DEFAULT_LIMITS_BY_SLUG = {
  free: {
    connectionRequestsPerDay: 10,
    aiCallsPerDay: 0,
    canCreateProjects: false,
    canChat: false,
    canCall: false,
    canVideoCall: false,
    canViewProfileViews: false,
    blueBadge: false,
    themeAccess: false,
  },
  silver: {
    connectionRequestsPerDay: 100,
    aiCallsPerDay: 20,
    canCreateProjects: true,
    canChat: true,
    canCall: true,
    canVideoCall: false,
    canViewProfileViews: true,
    blueBadge: true,
    themeAccess: false,
  },
  gold: {
    connectionRequestsPerDay: 500,
    aiCallsPerDay: null,
    canCreateProjects: true,
    canChat: true,
    canCall: true,
    canVideoCall: true,
    canViewProfileViews: true,
    blueBadge: true,
    themeAccess: true,
  },
};

export const getPlanLimits = async (slug) => {
  const plan = await getPlanBySlug(slug);
  const base = DEFAULT_LIMITS_BY_SLUG[slug] || FALLBACK_LIMITS;
  return { ...FALLBACK_LIMITS, ...base, ...(plan?.limits || {}) };
};

export const invalidatePlanCache = () => cache.clear();
