import express from "express";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";

import routes from "./routes/index.js";
import config from "./config/env.js";
import { errorConverter, errorHandler } from "./middlewares/error.middleware.js";
import logger from "./utils/logger.js";
import "./utils/cronJob.js";

const app = express();

app.use(
  cors({
    origin: config.cors.origins,
    credentials: config.cors.credentials,
  })
);

// Global Rate Limiting - protect against DoS
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use(globalLimiter);

app.use(helmet());
app.use("/payment/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: config.request?.jsonLimit || "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/", routes);

app.use(errorConverter);
app.use(errorHandler);

app.on("error", (error) => {
  logger.error("Express app error", error);
});

export default app;
