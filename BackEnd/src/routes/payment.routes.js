import { Router } from "express";

import {
  createPaymentController,
  paymentWebhookController,
  verifyPremiumController,
} from "../controllers/payment.controller.js";
import { userAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { createPaymentSchema } from "../validations/payment.validation.js";

const router = Router();

router.post(
  "/payment/create",
  userAuth,
  validate(createPaymentSchema),
  createPaymentController
);
router.post("/payment/webhook", paymentWebhookController);
router.get("/premium/verify", userAuth, verifyPremiumController);

export default router;
