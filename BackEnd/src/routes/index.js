import { Router } from "express";

import authRouter from "./auth.routes.js";
import requestRouter from "./request.routes.js";
import profileRouter from "./profile.routes.js";
import userRouter from "./user.routes.js";
import paymentRouter from "./payment.routes.js";
import chatRouter from "./chat.routes.js";
import notificationRouter from "./notification.routes.js";
import safetyRouter from "./safety.routes.js";
import projectRouter from "./project.routes.js";
import bookmarkRouter from "./bookmark.routes.js";
import githubRouter from "./github.routes.js";
import adminRouter from "./admin.routes.js";
import aiRouter from "./ai.routes.js";
import planRouter from "./plan.routes.js";

const router = Router();

router.use("/", authRouter);
router.use("/", requestRouter);
router.use("/", profileRouter);
router.use("/", userRouter);
router.use("/", paymentRouter);
router.use("/", chatRouter);
router.use("/", notificationRouter);
router.use("/", safetyRouter);
router.use("/", projectRouter);
router.use("/", bookmarkRouter);
router.use("/", githubRouter);
router.use("/", adminRouter);
router.use("/", aiRouter);
router.use("/plans", planRouter);

export default router;
