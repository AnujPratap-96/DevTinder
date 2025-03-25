const express = require("express");
const paymentRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const instance = require("../utils/razorpay");
const Payment = require("../models/payment");
const User = require("../models/user");
const membershipAmount = require("../utils/constants");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { membershipType } = req.body;
    if (!membershipType) {
      return res.status(400).json({ message: "Membership Type is required" });
    }
    const { firstName, lastName, _id, emailId } = req.user;
    const order = await instance.orders.create({
      amount: membershipAmount[membershipType] * 100,
      // The amount should be in paise, so multiply by 100
      currency: "INR",
      receipt: "order_rcptid_11",
      notes: {
        firstName,
        lastName,
        emailId,
        membershipType: membershipType,
      },
    });
    // console.log(order);
    const payment = new Payment({
      userId: _id,
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
    });
    const savedPayment = await payment.save();
    res
      .status(200)
      .json({ ...savedPayment.toJSON(), keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

paymentRouter.post("/payment/webhook", async (req, res) => {
  try {
    const webhookSignature = req.get("X-Razorpay-Signature");
    const isValidWebHook = validateWebhookSignature(
      JSON.stringify(req.body),
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );
    if (!isValidWebHook) {
      return res.status(400).json({ message: "Invalid Webhook Signature" });
    }

    const paymentDetails = req.body.payload.payment.entity;
    const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
    payment.status = paymentDetails.status;
    await payment.save();

    if (payment.status === "captured") {
      const user = await User.findOne({
        _id: payment.userId,
      });
      user.isPremium = true;
      user.membershipType = payment.notes.membershipType;

      await user.save();
    }
    // if (req.body.event === "payment.failed") {
    // }

    res.status(200).json({ message: "Webhook Received" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

paymentRouter.get("/premium/verify", userAuth, async (req, res) => {
   
  try {
    const user = req.user.toJSON();
   
    res.status(200).json({ isPremium: user.isPremium, membershipType: user.membershipType , user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }

});

module.exports = paymentRouter;
