import Payment from "../models/payment.js";
import User from "../models/user.model.js";
import config from "../config/env.js";
import membershipAmount from "../utils/constants.js";
import razorpayInstance from "../utils/razorpay.js";
import { AppError, ValidationError } from "../errors/index.js";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";

export const createPaymentOrder = async ({ user, membershipType }) => {
  if (!membershipType) {
    throw new ValidationError("Membership Type is required");
  }

  const amount = membershipAmount[membershipType];
  if (!amount) {
    throw new ValidationError("Invalid membership type");
  }

  const order = await razorpayInstance.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `order_${Date.now()}`,
    notes: {
      firstName: user.firstName,
      lastName: user.lastName,
      emailId: user.emailId,
      membershipType,
    },
  });

  const payment = await Payment.create({
    userId: user._id,
    orderId: order.id,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    notes: order.notes,
  });

  return { payment, keyId: config.payment.razorpayKeyId };
};

export const handleWebhook = async ({ signature, body }) => {
  const rawBody = Buffer.isBuffer(body) ? body.toString() : JSON.stringify(body);

  const isValid = validateWebhookSignature(
    rawBody,
    signature,
    config.payment.webhookSecret
  );

  if (!isValid) {
    throw new ValidationError("Invalid Webhook Signature");
  }

  const payload = Buffer.isBuffer(body) ? JSON.parse(body.toString()) : body;
  const paymentDetails = payload.payload.payment.entity;
  const payment = await Payment.findOne({ orderId: paymentDetails.order_id });
  if (!payment) {
    throw new AppError({ message: "Payment record not found", statusCode: 404 });
  }

  payment.status = paymentDetails.status;
  await payment.save();

  if (payment.status === "captured") {
    const user = await User.findById(payment.userId);
    if (user) {
      user.isPremium = true;
      user.membershipType = payment.notes.membershipType;
      await user.save();
    }
  }

  return { status: payment.status };
};

export const verifyPremium = (user) => ({
  isPremium: user.isPremium,
  membershipType: user.membershipType,
  user,
});
