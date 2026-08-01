import { AppError } from "../errors/index.js";

const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000;

const rateLimitStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

const aiRateLimit = (req, res, next) => {
  const userId = req.user?._id?.toString();
  if (!userId) {
    return next(new AppError({ message: "Authentication required", statusCode: 401, errorCode: "AUTH_REQUIRED" }));
  }

  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return next(new AppError({
      message: `AI rate limit reached. Try again in ${retryAfterSec}s.`,
      statusCode: 429,
      errorCode: "AI_RATE_LIMIT",
      details: { retryAfter: retryAfterSec },
    }));
  }

  entry.count += 1;
  return next();
};

export default aiRateLimit;
