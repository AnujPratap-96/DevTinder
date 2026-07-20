import dotenv from "dotenv";

dotenv.config();

const toNumber = (value, defaultValue) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const toArray = (value, delimiter = ",") => {
  if (!value) {
    return undefined;
  }
  return value
    .split(delimiter)
    .map((item) => item.trim())
    .filter(Boolean);
};

const config = {
  env: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
  port: toNumber(process.env.PORT, 3000),
  database: {
    uri: process.env.MONGO_URI,
  },
  cors: {
    origins: [
      ...(toArray(process.env.CORS_ORIGINS) || []),
      "http://localhost:5173",
      "https://dev-tinder-frontend-six-virid.vercel.app",
    ],
    credentials: true,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "8h",
  },
  signupJwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.SIGNUP_JWT_EXPIRES_IN || "1h",
  },
  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  },
  email: {
    brevoApiKey: process.env.BREVO_API_KEY,
  },
  payment: {
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  storage: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET_KEY,
  },
  ai: {
    mistralApiKey: process.env.MISTRAL_API_KEY,
  },
  github: {
    appUrl: process.env.APP_URL,
  },
  webrtc: {
    stunUrls: toArray(process.env.STUN_URLS) || ["stun:stun.l.google.com:19302"],
    turnUrls: toArray(process.env.TURN_URLS) || [],
    turnSecret: process.env.TURN_SECRET || null,
    turnTtlSec: toNumber(process.env.TURN_TTL_SEC, 600),
    callTimeoutMs: toNumber(process.env.CALL_TIMEOUT_MS, 10000),
    callConnectTimeoutMs: toNumber(process.env.CALL_CONNECT_TIMEOUT_MS, 10000),
    callIceRestartMs: toNumber(process.env.CALL_ICE_RESTART_MS, 5000),
  },
  requestJsonLimit: process.env.REQUEST_JSON_LIMIT,
};

export default config;
