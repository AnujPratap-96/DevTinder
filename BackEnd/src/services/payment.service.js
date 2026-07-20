import Payment from "../models/payment.js";
import User from "../models/user.model.js";
import Plan from "../models/plan.js";
import config from "../config/env.js";
import razorpayInstance from "../utils/razorpay.js";
import { AppError, ValidationError } from "../errors/index.js";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";

export const createPaymentOrder = async ({ user, membershipType }) => {
  if (!membershipType) {
    throw new ValidationError("Membership Type is required");
  }

  const slug = String(membershipType).toLowerCase();
  const plan = await Plan.findOne({ slug, isActive: true });
  if (!plan) {
    throw new ValidationError("Invalid or inactive membership plan");
  }
  if (plan.isFree) {
    throw new ValidationError("This plan does not require payment");
  }

  const order = await razorpayInstance.orders.create({
    amount: plan.price * 100,
    currency: plan.currency || "INR",
    receipt: `order_${Date.now()}`,
    notes: {
      firstName: user.firstName,
      lastName: user.lastName,
      emailId: user.emailId,
      membershipType: slug,
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

const applyMembership = async (userId, slug) => {
  const user = await User.findById(userId);
  if (!user) return null;
  const plan = slug ? await Plan.findOne({ slug }) : null;
  user.membershipType = slug || "free";
  user.planId = plan?._id ?? null;
  user.isPremium = Boolean(plan && !plan.isFree);
  if (plan && plan.durationMonths > 0) {
    user.membershipExpiresAt = new Date(
      Date.now() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000
    );
  } else {
    user.membershipExpiresAt = null;
  }
  await user.save();
  return user;
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
  const event = payload?.event;
  const paymentEntity = payload?.payload?.payment?.entity;
  if (!paymentEntity) {
    // Non-payment event (e.g. refund, dispute) — acknowledge so Razorpay stops retrying.
    console.log(`[webhook] Ignored non-payment event: ${event}`);
    return { status: "ignored", event };
  }

  const payment = await Payment.findOne({ orderId: paymentEntity.order_id });
  if (!payment) {
    throw new AppError({ message: "Payment record not found", statusCode: 404 });
  }

  payment.status = paymentEntity.status;
  await payment.save();

  if (payment.status === "captured") {
    const updated = await applyMembership(payment.userId, payment.notes?.membershipType);
    console.log(
      `[webhook] Activated membership="${updated?.membershipType}" for user=${payment.userId} (event=${event})`
    );
  } else {
    console.log(`[webhook] Payment status=${payment.status} (not captured) for user=${payment.userId}`);
  }

  return { status: payment.status, event };
};

export const verifyPremium = (user) => ({
  isPremium: user.isPremium,
  membershipType: user.membershipType,
  user,
});
