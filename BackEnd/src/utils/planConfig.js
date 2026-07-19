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
  canCreateProjects: false,
  canChat: false,
  canViewProfileViews: false,
  blueBadge: false,
  themeAccess: false,
};

export const getPlanLimits = async (slug) => {
  const plan = await getPlanBySlug(slug);
  if (!plan) return FALLBACK_LIMITS;
  return { ...FALLBACK_LIMITS, ...plan.limits };
};

export const invalidatePlanCache = () => cache.clear();
