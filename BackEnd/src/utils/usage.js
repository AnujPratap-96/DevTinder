import { getPlanBySlug } from "./planConfig.js";

const todayKey = () => new Date().toISOString().slice(0, 10);

/**
 * Increment (and enforce) a per-day counter stored on the user document.
 * Returns { allowed, remaining, limit, resetDate }.
 * `limit` of null/undefined means unlimited (no counting). `0` blocks entirely.
 */
export const checkDailyUsage = async (user, key, limit) => {
  if (limit === null || limit === undefined) {
    return { allowed: true, remaining: Infinity, limit };
  }

  const today = todayKey();
  const slot = user.usage?.[key];

  if (!slot || slot.date !== today) {
    if (!user.usage) user.usage = {};
    user.usage[key] = { count: 0, date: today };
  }

  if (user.usage[key].count >= limit) {
    return { allowed: false, remaining: 0, limit, resetDate: today };
  }

  user.usage[key].count += 1;
  await user.save();

  return { allowed: true, remaining: limit - user.usage[key].count, limit };
};

export const getDailyLimitFor = async (user, key) => {
  const plan = await getPlanBySlug(user?.membershipType || "free");
  return plan?.limits?.[key] ?? 0;
};
