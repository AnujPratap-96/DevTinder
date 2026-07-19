import { getPlanBySlug } from "../utils/planConfig.js";

/**
 * Gate a route behind a minimum membership tier.
 * `minimumSlug` is the slug of the lowest plan allowed (e.g. "silver").
 * Admins always pass. Plan expiry is already applied in the auth middleware,
 * so req.user.membershipType reflects the *effective* (possibly "free") plan.
 */
export const requireMinimumPlan = (minimumSlug) => async (req, res, next) => {
  if (req.user?.isAdmin) return next();

  try {
    const userSlug = req.user?.membershipType || "free";
    const [userPlan, minPlan] = await Promise.all([
      getPlanBySlug(userSlug),
      getPlanBySlug(minimumSlug),
    ]);

    const userOrder = userPlan?.order ?? 0;
    const minOrder = minPlan?.order ?? 0;

    if (userOrder >= minOrder) return next();

    return res.status(403).json({
      success: false,
      message: `This feature requires a ${minPlan?.name || minimumSlug} plan or higher.`,
      error: "PLAN_REQUIRED",
      requiredPlan: minimumSlug,
    });
  } catch (err) {
    return next(err);
  }
};
