import { Router } from "express";

import {
  createPaymentController,
  paymentWebhookController,
  verifyPremiumController,
} from "../controllers/payment.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/payment/create", userAuth, createPaymentController);
router.post("/payment/webhook", paymentWebhookController);
router.get("/premium/verify", userAuth, verifyPremiumController);

export default router;
