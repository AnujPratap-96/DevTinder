import { Router } from "express";

import { githubProfileController, githubSyncController } from "../controllers/github.controller.js";
import { userAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/github/profile", userAuth, githubProfileController);
router.post("/github/sync", userAuth, githubSyncController);

export default router;
