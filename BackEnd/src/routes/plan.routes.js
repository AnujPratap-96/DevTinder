import { Router } from "express";
import { listActivePlansController } from "../controllers/plan.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/", userAuth, listActivePlansController);

export default router;
