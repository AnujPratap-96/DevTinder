/**
 * aiRateLimit.js
 * Per-user in-memory rate limiter for AI endpoints.
 * Allows MAX_REQUESTS in WINDOW_MS per user.
 * Uses a sliding-window counter stored in a Map.
 */

const MAX_REQUESTS = 10;      // max AI calls
const WINDOW_MS = 60 * 1000; // per 1 minute

// Map<userId, { count: number, resetAt: number }>
const rateLimitStore = new Map();

// Cleanup stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

const aiRateLimit = (req, res, next) => {
  // req.user is attached by the userAuth middleware before this runs
  const userId = req.user?._id?.toString();
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now >= entry.resetAt) {
    // Fresh window
    rateLimitStore.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `AI rate limit reached. Try again in ${retryAfterSec}s.`,
      retryAfter: retryAfterSec,
    });
  }

  entry.count += 1;
  return next();
};

module.exports = aiRateLimit;
