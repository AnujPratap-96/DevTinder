import Plan from "../models/plan.js";
import { AppError, ValidationError } from "../errors/index.js";
import { invalidatePlanCache } from "../utils/planConfig.js";

const DEFAULT_PLANS = [
  {
    slug: "free",
    name: "Free",
    description: "Get started and explore the dev community.",
    price: 0,
    currency: "INR",
    durationMonths: 0,
    order: 0,
    isFree: true,
    isActive: true,
    features: [
      "Browse and discover developers",
      "Send up to 10 connection requests / day",
      "Bookmark profiles",
      "Endorse skills",
    ],
    limits: {
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
  },
  {
    slug: "silver",
    name: "Silver",
    description: "Unlock AI assist and collaboration.",
    price: 33,
    currency: "INR",
    durationMonths: 3,
    order: 1,
    isFree: false,
    isActive: true,
    features: [
      "Chat with your connections",
      "Verified Blue Badge",
      "100 connection requests / day",
      "AI features (20 / day)",
      "Create projects",
      "See who viewed your profile",
    ],
    limits: {
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
  },
  {
    slug: "gold",
    name: "Gold",
    description: "The full DevTinder experience.",
    price: 50,
    currency: "INR",
    durationMonths: 6,
    order: 2,
    isFree: false,
    isActive: true,
    features: [
      "Unlimited chat",
      "Verified Blue Badge",
      "500 connection requests / day",
      "AI features (unlimited)",
      "Create projects",
      "See who viewed your profile",
      "All premium themes",
    ],
    limits: {
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
  },
];

export const seedDefaultPlans = async () => {
  for (const plan of DEFAULT_PLANS) {
    // Create plans that don't exist yet. $setOnInsert ensures we never
    // overwrite admin edits (price, features, etc.) on restart/deploy.
    await Plan.findOneAndUpdate(
      { slug: plan.slug },
      { $setOnInsert: plan },
      { upsert: true, setDefaultsOnInsert: true }
    );
    // Always keep the call limits in sync with the code defaults so the
    // feature works even for plans seeded before these fields existed.
    // Other admin-editable fields (price, features) are left untouched.
    await Plan.updateOne(
      { slug: plan.slug },
      {
        $set: {
          "limits.canCall": plan.limits.canCall,
          "limits.canVideoCall": plan.limits.canVideoCall,
          "limits.canChat": plan.limits.canChat,
        },
      }
    );
  }
};

export const listPlans = async () => {
  return Plan.find().sort({ order: 1 }).lean();
};

export const listActivePlans = async () => {
  return Plan.find({ isActive: true }).sort({ order: 1 }).lean();
};

const sanitizePlanInput = (body = {}) => {
  const {
    name,
    description,
    price,
    currency,
    durationMonths,
    features,
    badgeLabel,
    accentColor,
    order,
    isActive,
    isFree,
    limits,
  } = body;

  const data = {};
  if (name !== undefined) data.name = String(name).trim();
  if (description !== undefined) data.description = String(description ?? "");
  if (price !== undefined) data.price = Math.max(0, Number(price) || 0);
  if (currency !== undefined) data.currency = String(currency || "INR");
  if (durationMonths !== undefined) data.durationMonths = Math.max(0, Number(durationMonths) || 0);
  if (badgeLabel !== undefined) data.badgeLabel = String(badgeLabel ?? "");
  if (accentColor !== undefined) data.accentColor = String(accentColor ?? "#6366f1");
  if (order !== undefined) data.order = Number(order) || 0;
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (isFree !== undefined) data.isFree = Boolean(isFree);
  // Free plans always have price 0 and are always active.
  if (data.isFree) {
    data.price = 0;
    data.isActive = true;
  }
  if (features !== undefined) {
    data.features = Array.isArray(features)
      ? features.map((f) => String(f).trim()).filter(Boolean)
      : String(features ?? "")
          .split("\n")
          .map((f) => f.trim())
          .filter(Boolean);
  }
  if (limits !== undefined) {
    const l = limits || {};
    const numOrNull = (v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    data.limits = {
      connectionRequestsPerDay: numOrNull(l.connectionRequestsPerDay),
      aiCallsPerDay: numOrNull(l.aiCallsPerDay),
      canCreateProjects: Boolean(l.canCreateProjects),
      canChat: Boolean(l.canChat),
      canCall: Boolean(l.canCall),
      canVideoCall: Boolean(l.canVideoCall),
      canViewProfileViews: Boolean(l.canViewProfileViews),
      blueBadge: Boolean(l.blueBadge),
      themeAccess: Boolean(l.themeAccess),
    };
  }
  return data;
};

export const createPlan = async (body) => {
  const { slug } = body || {};
  if (!slug || !/^[a-z0-9-]+$/.test(String(slug).toLowerCase())) {
    throw new ValidationError("A valid slug (lowercase letters/numbers/dashes) is required");
  }
  const cleanSlug = String(slug).toLowerCase();
  if (await Plan.findOne({ slug: cleanSlug })) {
    throw new ValidationError(`Plan with slug "${cleanSlug}" already exists`);
  }
  const data = sanitizePlanInput(body);
  data.slug = cleanSlug;
  const plan = await Plan.create(data);
  invalidatePlanCache();
  return plan;
};

export const updatePlan = async (id, body) => {
  const plan = await Plan.findById(id);
  if (!plan) throw new AppError({ message: "Plan not found", statusCode: 404 });
  if (plan.isFree && body?.price !== undefined && Number(body.price) > 0) {
    throw new ValidationError("The free plan price must stay 0");
  }
  const data = sanitizePlanInput(body);
  Object.assign(plan, data);
  await plan.save();
  invalidatePlanCache();
  return plan;
};

export const deletePlan = async (id) => {
  const plan = await Plan.findById(id);
  if (!plan) throw new AppError({ message: "Plan not found", statusCode: 404 });
  if (plan.isFree) {
    throw new ValidationError("The free plan cannot be deleted");
  }
  await plan.deleteOne();
  invalidatePlanCache();
  return { deleted: true };
};
