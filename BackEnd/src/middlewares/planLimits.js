import { getPlanBySlug } from "../utils/planConfig.js";
import { checkDailyUsage } from "../utils/usage.js";

/**
 * Enforces the per-day AI call quota from the user's plan.
 * `aiCallsPerDay: null` (gold) is treated as unlimited.
 */
export const aiDailyLimit = async (req, res, next) => {
  try {
    if (req.user?.isAdmin) return next();
    const plan = await getPlanBySlug(req.user?.membershipType || "free");
    if (!plan) {
      return res.status(403).json({
        success: false,
        message: "Plan not found. Please contact support.",
        error: "PLAN_REQUIRED",
      });
    }

    // `null`/`undefined` means unlimited (e.g. Gold). Must check BEFORE coercing.
    const limit = plan.limits.aiCallsPerDay;
    if (limit === null || limit === undefined) return next();

    const { allowed } = await checkDailyUsage(req.user, "aiCalls", limit);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: `Daily AI limit (${limit} calls) reached. Try tomorrow or upgrade your plan.`,
        error: "AI_LIMIT_REACHED",
      });
    }
    return next();
  } catch (err) {
    return next(err);
  }
};
