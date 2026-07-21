import express from "express";
import { runDailyReminders, runPlanExpirySweep } from "../utils/cronJob.js";
import CronState from "../models/cronState.js";
import logger from "../utils/logger.js";

const router = express.Router();

const MIN_RUN_INTERVAL_MS = 12 * 60 * 60 * 1000;

router.post("/cron/daily-reminders", async (req, res) => {
  const allowed = await CronState.ensureRun("daily-reminders", MIN_RUN_INTERVAL_MS);
  if (!allowed) {
    return res.json({ ok: true, skipped: true, reason: "Already ran within 12 hours" });
  }
  logger.info("Cron trigger: daily-reminders");
  await runDailyReminders();
  res.json({ ok: true, skipped: false });
});

router.post("/cron/plan-expiry", async (req, res) => {
  const allowed = await CronState.ensureRun("plan-expiry", MIN_RUN_INTERVAL_MS);
  if (!allowed) {
    return res.json({ ok: true, skipped: true, reason: "Already ran within 12 hours" });
  }
  logger.info("Cron trigger: plan-expiry");
  await runPlanExpirySweep();
  res.json({ ok: true, skipped: false });
});

export default router;
