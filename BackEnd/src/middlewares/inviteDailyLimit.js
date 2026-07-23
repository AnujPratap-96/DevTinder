import { getPlanLimits } from "../utils/planConfig.js";
import { checkMonthlyUsage } from "../utils/usage.js";

export const inviteDailyLimit = async (req, res, next) => {
  try {
    if (req.user?.isAdmin) return next();

    const planLimits = await getPlanLimits(req.user?.membershipType || "free");
    const limit = planLimits.invitesPerMonth;

    if (limit === null || limit === undefined) return next();

    const { allowed, remaining } = await checkMonthlyUsage(req.user, "invitesSent", limit);
    if (!allowed) {
      return res.status(429).json({
        success: false,
        message: "You've used all invites included in your plan. Upgrade to send more invitations.",
        error: "INVITE_LIMIT_REACHED",
        remaining: 0,
      });
    }

    req.inviteRemaining = remaining;
    return next();
  } catch (err) {
    return next(err);
  }
};
