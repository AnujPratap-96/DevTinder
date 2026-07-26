import ConnectionRequest from "../models/connectionRequest.js";
import User from "../models/user.model.js";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { run as sendEmail } from "./sendEmail.js";
import logger from "./logger.js";

export const runDailyReminders = async () => {
  try {
    const yesterday = subDays(new Date(), 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    const pendingRequests = await ConnectionRequest.find({
      status: "interested",
      createdAt: { $gte: yesterdayStart, $lt: yesterdayEnd },
    })
      .select("toUserId")
      .populate({ path: "toUserId", select: "emailId" });

    const listOfEmails = [
      ...new Set(pendingRequests.map((req) => req.toUserId?.emailId).filter(Boolean)),
    ];

    if (listOfEmails.length === 0) {
      logger.info("No pending requests from yesterday to remind about");
      return;
    }

    logger.info(`Sending ${listOfEmails.length} daily reminders`);

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
          <a href="https://dev-tinder-frontend-six-virid.vercel.app/requests"
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
};

export const runPlanExpirySweep = async () => {
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
};
