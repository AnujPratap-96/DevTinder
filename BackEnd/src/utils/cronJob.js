const cron = require("node-cron");
const ConnectionRequest = require("../models/connectionRequest");
const { subDays, startOfDay, endOfDay } = require("date-fns");
const { run } = require("./sendEmail");

cron.schedule("0 8 * * *", async () => {
  try {
    const yesterday = subDays(new Date(), 0);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);
    const pendingRequests = await ConnectionRequest.find({
      status: "interested",
      createdAt: {
        $gte: yesterdayStart,
        $lt: yesterdayEnd,
      },
    }).populate("fromUserId , toUserId");
    const listofEmails = [
      ...new Set(pendingRequests.map((req) => req.toUserId.emailId)),
    ];
    for (const email of listofEmails) {
      try {
        const subject = `You Have Pending Friend Requests – Don’t Miss Out!`;
        const body = `Hi User,
              You have pending friend requests waiting for you! Connect with your friends and expand your network today.

             ✅ Check your friend requests now and start engaging!

             Don’t keep your friends waiting!

             Best,[devs-tinder.site]`;
        const res = run(subject, body, email);
        console.log(res);
      } catch (err) {
        console.log(err);
      }
    }
  } catch (err) {
    console.error(err);
  }
});
