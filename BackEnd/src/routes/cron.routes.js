import express from "express";
import { runDailyReminders, runPlanExpirySweep } from "../utils/cronJob.js";
import CronState from "../models/cronState.js";
import logger from "../utils/logger.js";

const router = express.Router();

router.post("/cron/daily-reminders", async (req, res) => {
  const allowed = await CronState.ensureRun("daily-reminders");
  if (!allowed) {
    return res.json({ ok: true, skipped: true, reason: "Already ran today" });
  }
  logger.info("Cron trigger: daily-reminders");
  await runDailyReminders();
  res.json({ ok: true, skipped: false });
});

router.post("/cron/plan-expiry", async (req, res) => {
  const allowed = await CronState.ensureRun("plan-expiry");
  if (!allowed) {
    return res.json({ ok: true, skipped: true, reason: "Already ran today" });
  }
  logger.info("Cron trigger: plan-expiry");
  await runPlanExpirySweep();
  res.json({ ok: true, skipped: false });
});

export default router;
