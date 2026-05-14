import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createPaymentOrder,
  handleWebhook,
  verifyPremium,
} from "../services/payment.service.js";

export const createPaymentController = asyncHandler(async (req, res) => {
  const result = await createPaymentOrder({
    user: req.user,
    membershipType: req.body?.membershipType,
  });
  return successResponse(res, {
    message: "Payment order created",
    data: { payment: result.payment, keyId: result.keyId },
  });
});

export const paymentWebhookController = asyncHandler(async (req, res) => {
  await handleWebhook({
    signature: req.get("X-Razorpay-Signature"),
    body: req.body,
  });
  return successResponse(res, { message: "Webhook Received" });
});

export const verifyPremiumController = asyncHandler(async (req, res) => {
  const data = verifyPremium(req.user.toJSON());
  return successResponse(res, { data });
});
