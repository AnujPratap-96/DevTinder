import express from "express";
import { runDailyReminders, runPlanExpirySweep } from "../utils/cronJob.js";
import CronState from "../models/cronState.js";
import { asyncHandler } from "../utils/async-handler.js";
import logger from "../utils/logger.js";

const router = express.Router();

router.post(
  "/cron/daily-reminders",
  asyncHandler(async (req, res) => {
    const allowed = await CronState.ensureRun("daily-reminders");
    if (!allowed) {
      return res.json({ ok: true, skipped: true, reason: "Already ran today" });
    }
    logger.info("Cron trigger: daily-reminders");
    // Fire-and-forget: don't block HTTP response on email sending.
    // If awaited, Render's proxy may time out (>30s) and return a
    // large 504 HTML page, which cron-job.org rejects as "data too big".
    runDailyReminders().catch((err) => logger.error("daily-reminders background failed", err));
    res.json({ ok: true, skipped: false });
  })
);

router.post(
  "/cron/plan-expiry",
  asyncHandler(async (req, res) => {
    const allowed = await CronState.ensureRun("plan-expiry");
    if (!allowed) {
      return res.json({ ok: true, skipped: true, reason: "Already ran today" });
    }
    logger.info("Cron trigger: plan-expiry");
    runPlanExpirySweep().catch((err) => logger.error("plan-expiry background failed", err));
    res.json({ ok: true, skipped: false });
  })
);

export default router;
