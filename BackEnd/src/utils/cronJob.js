const cron = require("node-cron");
const ConnectionRequest = require("../models/connectionRequest");
const { subDays, startOfDay, endOfDay } = require("date-fns");
const { run } = require("./sendEmail");

// Runs every day at 10 AM
cron.schedule(" 0 10 * * *", async () => {
  try {
    // Yesterday's range
    const yesterday = subDays(new Date(), 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);


    // Find all requests marked "interested" yesterday
    const pendingRequests = await ConnectionRequest.find({
      status: "interested",
      createdAt: {
        $gte: yesterdayStart,
        $lt: yesterdayEnd,
      },
    }).populate("fromUserId toUserId");

    // Collect unique recipient emails
    const listOfEmails = [
      ...new Set(pendingRequests.map((req) => req.toUserId.emailId)),
    ];
    for (const email of listOfEmails) {
      try {
        const subject = `You Have Pending Friend Requests – Don’t Miss Out!`;

        // HTML structured body
        const body = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2c3e50;">Hi User, 👋</h2>

          <p>
            You have <strong>pending friend requests</strong> waiting for you! 
            Connect with your friends and expand your network today.
          </p>

          <p style="margin: 20px 0;">
            ✅ <strong>Check your friend requests now</strong> and start engaging!
          </p>

          <a href="https://devs-tinder.site/requests" 
             style="display: inline-block; padding: 12px 20px; background-color: #3498db; 
                    color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Requests
          </a>

          <p style="margin-top: 30px;">
            Don’t keep your friends waiting!
          </p>

          <p>
            Best,<br/>
            <strong>devs-tinder.site</strong>
          </p>
        </div>
        `;

        const res = await run(subject, body, email);
     
      } catch (err) {
       res.status(500).json({ message: "Error sending email to " + email, error: err.message });
      }
    }
  } catch (err) {
    res.status(500).json({ message: "Error processing cron job", error: err.message });
  }
});
