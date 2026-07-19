import cron from "node-cron";
import { subDays, startOfDay, endOfDay } from "date-fns";
import ConnectionRequest from "../models/connectionRequest.js";
import User from "../models/user.model.js";
import { run as sendEmail } from "./sendEmail.js";
import logger from "./logger.js";

cron.schedule("0 10 * * *", async () => {
  try {
    const yesterday = subDays(new Date(), 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    const pendingRequests = await ConnectionRequest.find({
      status: "interested",
      createdAt: {
        $gte: yesterdayStart,
        $lt: yesterdayEnd,
      },
    }).populate("fromUserId toUserId");

    const listOfEmails = [
      ...new Set(pendingRequests.map((req) => req.toUserId?.emailId).filter(Boolean)),
    ];

    for (const email of listOfEmails) {
      try {
        const subject = "You Have Pending Friend Requests – Don’t Miss Out!";
        const body = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2c3e50;">Hi Developer 👋</h2>
          <p>
            You have <strong>pending connection requests</strong> waiting for you!
            Review them now to grow your DevTinder network.
          </p>
          <a href="https://devs-tinder.site/requests"
             style="display: inline-block; padding: 12px 20px; background-color: #3498db; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Requests
          </a>
          <p style="margin-top: 30px;">Keep building great connections!</p>
          <p>Best,<br/><strong>DevTinder Team</strong></p>
        </div>
        `;

        await sendEmail(subject, body, email);
      } catch (emailError) {
        logger.error(`Cron email error for ${email}`, emailError);
      }
    }
  } catch (error) {
    logger.error("Cron job processing failed", error);
  }
});

// Revert expired paid plans back to "free" (runs nightly).
cron.schedule("30 0 * * *", async () => {
  try {
    const result = await User.updateMany(
      {
        membershipType: { $ne: "free" },
        membershipExpiresAt: { $ne: null, $lt: new Date() },
      },
      {
        $set: {
          membershipType: "free",
          isPremium: false,
          planId: null,
          membershipExpiresAt: null,
        },
      }
    );
    if (result.modifiedCount > 0) {
      logger.info(`Reverted ${result.modifiedCount} expired plan(s) to free`);
    }
  } catch (error) {
    logger.error("Plan expiry sweep failed", error);
  }
});

export default cron;
