import { Router } from "express";

import { blockUserController, reportUserController } from "../controllers/safety.controller.js";
import { userAuth } from "../middlewares/auth.js";
import validate from "../middlewares/validate.js";
import { blockUserSchema, reportUserSchema } from "../validations/safety.validation.js";

const router = Router();

router.post(
  "/block",
  userAuth,
  validate(blockUserSchema),
  blockUserController
);
router.post(
  "/report",
  userAuth,
  validate(reportUserSchema),
  reportUserController
);

export default router;
