import { getPlanBySlug } from "../utils/planConfig.js";
import { AppError } from "../errors/index.js";

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

    return next(new AppError({
      message: `This feature requires a ${minPlan?.name || minimumSlug} plan or higher.`,
      statusCode: 403,
      errorCode: "PLAN_REQUIRED",
      details: { requiredPlan: minimumSlug },
    }));
  } catch (err) {
    return next(err);
  }
};
