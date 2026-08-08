import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createProject,
  listProjects,
  listMyProjects,
  requestProjectJoin,
  listProjectRequests,
  respondToProjectRequest,
  removeProjectMember,
  getProjectDetails,
  addProjectMessage,
  listProjectMessages,
  deleteAllProjects,
  updateProject,
  deleteProject,
} from "../services/project.service.js";

export const createProjectController = asyncHandler(async (req, res) => {
  const project = await createProject({
    ownerId: req.user._id,
    title: req.body?.title,
    description: req.body?.description,
    techStack: req.body?.techStack,
  });
  return successResponse(res, { statusCode: 201, message: "Project created", data: { project } });
});

export const listProjectsController = asyncHandler(async (req, res) => {
  const data = await listProjects({ status: req.query?.status, userId: req.user._id, limit: req.query?.limit, cursor: req.query?.cursor });
  return successResponse(res, { message: "Projects fetched", data });
});

export const listMyProjectsController = asyncHandler(async (req, res) => {
  const data = await listMyProjects(req.user._id, req.query);
  return successResponse(res, { message: "Your projects fetched", data });
});

export const requestProjectJoinController = asyncHandler(async (req, res) => {
  const result = await requestProjectJoin({ projectId: req.body?.projectId, userId: req.user._id });
  return successResponse(res, { message: "Join request sent", data: { request: result } });
});

export const listProjectRequestsController = asyncHandler(async (req, res) => {
  const requests = await listProjectRequests({ projectId: req.params.projectId, userId: req.user._id });
  return successResponse(res, { message: "Project requests fetched", data: { requests } });
});

export const respondProjectRequestController = asyncHandler(async (req, res) => {
  const project = await respondToProjectRequest({
    projectId: req.body?.projectId,
    requestId: req.body?.requestId,
    action: req.body?.action,
    userId: req.user._id,
  });
  return successResponse(res, { message: `Request ${req.body?.action}ed`, data: { project } });
});

export const removeProjectMemberController = asyncHandler(async (req, res) => {
  const result = await removeProjectMember({
    projectId: req.params.projectId,
    memberId: req.params.memberId,
    userId: req.user._id,
  });
  return successResponse(res, { message: "Member removed", data: { project: result } });
});

export const getProjectController = asyncHandler(async (req, res) => {
  const project = await getProjectDetails({ projectId: req.params.projectId, userId: req.user._id });
  return successResponse(res, { message: "Project fetched", data: { project } });
});

export const addProjectMessageController = asyncHandler(async (req, res) => {
  const message = await addProjectMessage({
    projectId: req.params.projectId,
    userId: req.user._id,
    message: req.body?.message,
    mentions: req.body?.mentions,
  });
  return successResponse(res, { statusCode: 201, message: "Message added", data: { message } });
});

export const listProjectMessagesController = asyncHandler(async (req, res) => {
  const data = await listProjectMessages({
    projectId: req.params.projectId,
    userId: req.user._id,
    limit: req.query?.limit,
    cursor: req.query?.cursor,
  });
  return successResponse(res, { message: "Messages fetched", data });
});

export const deleteAllProjectsController = asyncHandler(async (req, res) => {
  const result = await deleteAllProjects({ user: req.user });
  return successResponse(res, { message: "All projects deleted", data: { result } });
});

export const updateProjectController = asyncHandler(async (req, res) => {
  const project = await updateProject({
    projectId: req.params.projectId,
    userId: req.user._id,
    title: req.body?.title,
    description: req.body?.description,
    techStack: req.body?.techStack,
    status: req.body?.status,
  });
  return successResponse(res, { message: "Project updated successfully", data: { project } });
});

export const deleteProjectController = asyncHandler(async (req, res) => {
  const result = await deleteProject({ projectId: req.params.projectId, userId: req.user._id });
  return successResponse(res, { message: "Project deleted", data: { result } });
});
