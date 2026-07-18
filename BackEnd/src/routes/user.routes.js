import { Router } from "express";
import { userAuth } from "../middlewares/auth.js";
import {
  getReceivedRequestsController,
  getConnectionsController,
  getFeedController,
  getUsersController,
  searchUsersController,
  endorseUserController,
  savePublicKeyController,
  getPublicKeyController,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/user/requests/received", userAuth, getReceivedRequestsController);
router.get("/user/connections", userAuth, getConnectionsController);
router.get("/user/feed", userAuth, getFeedController);
router.get("/feed", userAuth, getFeedController);
router.get("/users", userAuth, getUsersController);
router.get("/search", userAuth, searchUsersController);
router.post("/user/endorse", userAuth, endorseUserController);
router.post("/user/public-key", userAuth, savePublicKeyController);
router.get("/user/public-key/:userId", userAuth, getPublicKeyController);

export default router;
