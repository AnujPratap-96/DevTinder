import { Router } from "express";
import { userAuth } from "../middlewares/auth.js";
import {
  getCallHistory,
  getMissedCalls,
  getActiveCall,
  ackMissedCall,
  getTurnCredentials,
} from "../controllers/call.controller.js";

const router = Router();

router.use(userAuth);

router.get("/history", getCallHistory);
router.get("/missed", getMissedCalls);
router.get("/active", getActiveCall);
router.get("/turn-credentials", getTurnCredentials);
router.patch("/:id/ack", ackMissedCall);

export default router;
