import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";

const sendTooMany = (res, retryAfterSec) =>
  res.status(429).json({
    success: false,
    message: "Too many requests, please try again later.",
    retryAfterSec,
  });

export const makeRateLimiter = (points, duration, keyPrefix) =>
  new RateLimiterMemory({ points, duration, keyPrefix });

// Global abuse guard — token bucket per IP (1000 req / 15 min, smooth refill)
export const globalLimiter = makeRateLimiter(1000, 15 * 60, "global");

// Auth brute-force guard — token bucket per IP (10 attempts / 15 min)
export const authLimiter = makeRateLimiter(10, 15 * 60, "auth");

// OTP abuse guard — token bucket per email (5 sends / hour)
export const otpLimiter = makeRateLimiter(5, 60 * 60, "otp");

// Expensive route guard — token bucket per user (configurable)
export const userAiLimiter = makeRateLimiter(10, 60, "user-ai");
export const userUploadLimiter = makeRateLimiter(60, 60 * 60, "user-upload");

export const rateLimit = (limiter, keyFn) => async (req, res, next) => {
  try {
    await limiter.consume(keyFn(req));
    next();
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return sendTooMany(res, Math.ceil(err.msBeforeNext / 1000));
    }
    next(err);
  }
};

export default rateLimit;
