import { Router } from "express";

import {
  createProjectController,
  listProjectsController,
  listMyProjectsController,
  requestProjectJoinController,
  listProjectRequestsController,
  respondProjectRequestController,
  removeProjectMemberController,
  getProjectController,
  addProjectMessageController,
  listProjectMessagesController,
  deleteAllProjectsController,
  updateProjectController,
  deleteProjectController,
} from "../controllers/project.controller.js";
import { userAuth } from "../middlewares/auth.js";
import { requireMinimumPlan } from "../middlewares/requirePlan.js";
import validate from "../middlewares/validate.js";
import {
  createProjectSchema,
  updateProjectSchema,
  requestJoinSchema,
  respondToRequestSchema,
  addProjectMessageSchema,
} from "../validations/project.validation.js";

const router = Router();
const planGuard = [userAuth, requireMinimumPlan("silver")];

router.post(
  "/project",
  ...planGuard,
  validate(createProjectSchema),
  createProjectController
);
router.get("/projects", userAuth, listProjectsController);
router.get("/project/my", userAuth, listMyProjectsController);
router.post(
  "/project/request",
  userAuth,
  validate(requestJoinSchema),
  requestProjectJoinController
);
router.get("/project/:projectId/requests", userAuth, listProjectRequestsController);
router.post(
  "/project/request/respond",
  userAuth,
  validate(respondToRequestSchema),
  respondProjectRequestController
);
router.delete("/project/:projectId/member/:memberId", ...planGuard, removeProjectMemberController);
router.get("/project/:projectId", userAuth, getProjectController);
router.post(
  "/project/:projectId/message",
  userAuth,
  validate(addProjectMessageSchema),
  addProjectMessageController
);
router.get("/project/:projectId/messages", userAuth, listProjectMessagesController);
router.delete("/project/delete-all", ...planGuard, deleteAllProjectsController);
router.patch(
  "/project/:projectId",
  ...planGuard,
  validate(updateProjectSchema),
  updateProjectController
);
router.delete("/project/:projectId", ...planGuard, deleteProjectController);

export default router;
