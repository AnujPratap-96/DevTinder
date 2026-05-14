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

const router = Router();

router.post("/project", userAuth, createProjectController);
router.get("/projects", userAuth, listProjectsController);
router.get("/project/my", userAuth, listMyProjectsController);
router.post("/project/request", userAuth, requestProjectJoinController);
router.get("/project/:projectId/requests", userAuth, listProjectRequestsController);
router.post("/project/request/respond", userAuth, respondProjectRequestController);
router.delete("/project/:projectId/member/:memberId", userAuth, removeProjectMemberController);
router.get("/project/:projectId", userAuth, getProjectController);
router.post("/project/:projectId/message", userAuth, addProjectMessageController);
router.get("/project/:projectId/messages", userAuth, listProjectMessagesController);
router.delete("/project/delete-all", userAuth, deleteAllProjectsController);
router.patch("/project/:projectId", userAuth, updateProjectController);
router.delete("/project/:projectId", userAuth, deleteProjectController);

export default router;
