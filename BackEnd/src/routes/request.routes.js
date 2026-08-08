import { Router } from "express";

import { sendRequestController, reviewRequestController } from "../controllers/request.controller.js";
import { userAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import {
  sendRequestParamsSchema,
  reviewRequestParamsSchema,
} from "../validations/request.validation.js";

const router = Router();

router.post(
  "/request/send/:status/:touserId",
  userAuth,
  validate(sendRequestParamsSchema),
  sendRequestController
);

router.post(
  "/request/review/:status/:requestId",
  userAuth,
  validate(reviewRequestParamsSchema),
  reviewRequestController
);

export default router;
