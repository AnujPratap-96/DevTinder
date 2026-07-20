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
    const limit = plan?.limits?.aiCallsPerDay ?? 0;

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
