import { getPlanLimits } from "../utils/planConfig.js";
import { checkDailyUsage } from "../utils/usage.js";
import { AppError } from "../errors/index.js";

export const aiDailyLimit = async (req, res, next) => {
  try {
    if (req.user?.isAdmin) return next();
    const planLimits = await getPlanLimits(req.user?.membershipType || "free");

    const limit = planLimits.aiCallsPerDay;
    if (limit === null || limit === undefined) return next();

    const { allowed } = await checkDailyUsage(req.user, "aiCalls", limit);
    if (!allowed) {
      return next(new AppError({
        message: `Daily AI limit (${limit} calls) reached. Try tomorrow or upgrade your plan.`,
        statusCode: 429,
        errorCode: "AI_LIMIT_REACHED",
      }));
    }
    return next();
  } catch (err) {
    return next(err);
  }
};
