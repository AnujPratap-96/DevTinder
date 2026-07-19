import { Router } from "express";
import { listActivePlansController } from "../controllers/plan.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

// Public: active plans for the Premium page.
router.get("/", userAuth, listActivePlansController);

export default router;
