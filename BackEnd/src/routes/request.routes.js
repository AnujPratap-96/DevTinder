import { Router } from "express";

import { sendRequestController, reviewRequestController } from "../controllers/request.controller.js";
import { userAuth } from "../middlewares/auth.js";
import { validateConnectionRequest } from "../utils/validation.js";

const router = Router();

router.post(
  "/request/send/:status/:touserId",
  userAuth,
  validateConnectionRequest,
  sendRequestController
);

router.post("/request/review/:status/:requestId", userAuth, reviewRequestController);

export default router;
