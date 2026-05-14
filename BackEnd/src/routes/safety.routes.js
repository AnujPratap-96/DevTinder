import { Router } from "express";

import { blockUserController, reportUserController } from "../controllers/safety.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

router.post("/block", userAuth, blockUserController);
router.post("/report", userAuth, reportUserController);

export default router;
