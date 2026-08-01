import mongoose from "mongoose";

import * as projectRepo from "../repositories/project.repository.js";
import { createNotificationAndNotify } from "../utils/notify.js";
import { AppError, ValidationError, NotFoundError } from "../errors/index.js";

const getMemberUserId = (member) => (typeof member === "object" ? member?.userId : member);
const getRequestUserId = (req) => (typeof req?.userId === "object" ? req?.userId : req?.userId);

const POPULATE_OWNER = { path: "ownerId", select: "firstName lastName photoUrl role" };
const POPULATE_MEMBERS = { path: "members.userId", select: "firstName lastName photoUrl role" };
const POPULATE_JOIN_REQUESTS = { path: "joinRequests.userId", select: "firstName lastName photoUrl" };
const POPULATE_MESSAGES = { path: "messages.senderId", select: "firstName lastName photoUrl" };

const PROJECT_POPULATE = [POPULATE_OWNER, POPULATE_MEMBERS, POPULATE_JOIN_REQUESTS];

export const createProject = async ({ ownerId, title, description, techStack }) => {
  if (!title || !description) {
    throw new ValidationError("title and description are required");
  }

  const project = await projectRepo.createProject({
    title,
    description,
    techStack: techStack || [],
    ownerId,
    members: [{ userId: ownerId, role: "owner" }],
    joinRequests: [],
  });

  await project.populate("ownerId", "firstName lastName photoUrl");
  return project;
};

const transformProject = (project, userId) => {
  const isMember = project.members?.some(
    (m) => getMemberUserId(m)?.toString() === userId.toString()
  );
  const hasPendingRequest = project.joinRequests?.some(
    (r) => getRequestUserId(r)?.toString() === userId.toString() && r.status === "pending"
  );
  const transformedJoinRequests = project.joinRequests?.map((r) => ({
    _id: r._id,
    user: r.userId,
    status: r.status,
    requestedAt: r.requestedAt,
  })) || [];
  return {
    ...project,
    joinRequests: transformedJoinRequests,
    isMember: !!isMember,
    hasPendingRequest: !!hasPendingRequest,
  };
};

export const listProjects = async ({ status, userId, limit = 20, cursor = null }) => {
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const filter = {};
  if (status && ["open", "in_progress", "completed"].includes(status)) {
    filter.status = status;
  }
  if (cursor) filter._id = { $lt: cursor };

  const docs = await projectRepo.findAndPopulateProjects(filter, PROJECT_POPULATE, { limit: pageSize, cursor, sort: { createdAt: -1 } });

  const hasMore = docs.length > pageSize;
  const projects = hasMore ? docs.slice(0, pageSize) : docs;
  const mapped = projects.map((project) => transformProject(project, userId));
  const nextCursor = hasMore ? projects[projects.length - 1]._id : null;
  return { projects: mapped, nextCursor, hasMore };
};

export const listMyProjects = async (userId, { limit = 20, cursor = null } = {}) => {
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
  const filter = { "members.userId": userId };
  if (cursor) filter._id = { $lt: cursor };
  const docs = await projectRepo.findAndPopulateProjects(filter, [POPULATE_OWNER, POPULATE_MEMBERS], { limit: pageSize, cursor, sort: { createdAt: -1 } });
  const hasMore = docs.length > pageSize;
  const projects = hasMore ? docs.slice(0, pageSize) : docs;
  const nextCursor = hasMore ? projects[projects.length - 1]._id : null;
  return { projects, nextCursor, hasMore };
};

export const requestProjectJoin = async ({ projectId, userId }) => {
  if (!projectId || !mongoose.isValidObjectId(projectId)) {
    throw new ValidationError("Valid projectId is required");
  }

  const project = await projectRepo.findProjectById(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  if (project.isMember(userId)) {
    throw new ValidationError("Already a member");
  }

  if (project.hasPendingRequest(userId)) {
    throw new ValidationError("Join request already pending");
  }

  project.joinRequests = project.joinRequests || [];
  project.joinRequests.push({ userId, status: "pending" });
  await projectRepo.saveProject(project);

  await createNotificationAndNotify({
    userId: project.ownerId,
    type: "project.join_request",
    payload: {
      projectTitle: project.title,
    },
  });

  return { message: "Join request sent" };
};

export const listProjectRequests = async ({ projectId, userId }) => {
  const project = await projectRepo.findProjectById(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  const userRole = project.getUserRole(userId);
  if (!userRole || !["owner", "admin"].includes(userRole)) {
    throw new AppError({ message: "Only owners/admins can view requests", statusCode: 403 });
  }

  await project.populate("joinRequests.userId", "firstName lastName photoUrl role");

  const requests = project.joinRequests
    .filter((r) => r.status === "pending")
    .map((r) => ({
      _id: r._id,
      user: r.userId,
      requestedAt: r.requestedAt,
    }));

  return requests;
};

export const respondToProjectRequest = async ({ projectId, requestId, action, userId }) => {
  if (!projectId || !requestId || !action) {
    throw new ValidationError("projectId, requestId, and action are required");
  }

  if (!["accept", "reject"].includes(action)) {
    throw new ValidationError("action must be accept or reject");
  }

  const project = await projectRepo.findProjectById(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  const userRole = project.getUserRole(userId);
  if (!userRole || !["owner", "admin"].includes(userRole)) {
    throw new AppError({ message: "Only owners/admins can respond to requests", statusCode: 403 });
  }

  const request = project.joinRequests.id(requestId);
  if (!request) {
    throw new NotFoundError("Request");
  }

  if (request.status !== "pending") {
    throw new ValidationError("Request already processed");
  }

  request.status = action === "accept" ? "accepted" : "rejected";
  request.respondedAt = new Date();
  request.respondedBy = userId;

  if (action === "accept") {
    project.members.push({ userId: request.userId, role: "member" });
    await createNotificationAndNotify({
      userId: request.userId,
      type: "project.request_accepted",
      payload: {
        projectTitle: project.title,
      },
    });
  } else {
    await createNotificationAndNotify({
      userId: request.userId,
      type: "project.request_rejected",
      payload: {
        projectTitle: project.title,
      },
    });
  }

  await projectRepo.saveProject(project);

  project.joinRequests = project.joinRequests.filter((r) => r._id.toString() !== requestId);
  await projectRepo.saveProject(project);
  await project.populate("ownerId", "firstName lastName photoUrl");
  await project.populate("members.userId", "firstName lastName photoUrl role");

  return project;
};

export const removeProjectMember = async ({ projectId, memberId, userId }) => {
  const project = await projectRepo.findProjectById(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  const userRole = project.getUserRole(userId);
  if (!userRole || !["owner", "admin"].includes(userRole)) {
    throw new AppError({ message: "Only owners/admins can remove members", statusCode: 403 });
  }

  if (!mongoose.isValidObjectId(memberId)) {
    throw new ValidationError("Invalid memberId");
  }

  const memberIndex = project.members.findIndex((m) => {
    const mid = getMemberUserId(m);
    return mid?.toString() === memberId;
  });

  if (memberIndex === -1) {
    throw new NotFoundError("Member");
  }

  const member = project.members[memberIndex];
  if (member.role === "owner") {
    throw new ValidationError("Cannot remove owner");
  }

  project.members.splice(memberIndex, 1);
  await projectRepo.saveProject(project);

  await createNotificationAndNotify({
    userId: member.userId,
    type: "project.member_removed",
    payload: {
      projectId: project._id,
      projectTitle: project.title,
    },
  });

  return { message: "Member removed" };
};

export const getProjectDetails = async ({ projectId, userId }) => {
  const project = await projectRepo.findAndPopulateProject(projectId, [
    POPULATE_OWNER,
    POPULATE_MEMBERS,
    POPULATE_JOIN_REQUESTS,
  ]);

  if (!project) {
    throw new NotFoundError("Project");
  }

  const userRole = project.getUserRole(userId);
  const isMember = project.isMember(userId);

  if (!isMember && project.status !== "open") {
    throw new AppError({ message: "Project is no longer open for joining", statusCode: 403 });
  }

  const response = {
    ...project.toObject(),
    userRole,
    isMember,
    joinRequests:
      isMember && userRole
        ? project.joinRequests.map((r) => ({
            _id: r._id,
            user: r.userId,
            status: r.status,
            requestedAt: r.requestedAt,
          }))
        : [],
  };

  return response;
};

export const addProjectMessage = async ({ projectId, userId, message, mentions }) => {
  if (!message?.trim()) {
    throw new ValidationError("message is required");
  }

  const project = await projectRepo.findProjectById(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  if (!project.isMember(userId)) {
    throw new AppError({ message: "Only members can post messages", statusCode: 403 });
  }

  const newMessage = {
    senderId: userId,
    message: message.trim(),
    mentions: mentions || [],
  };

  project.messages.push(newMessage);
  await projectRepo.saveProject(project);

  await project.populate("messages.senderId", "firstName lastName photoUrl");
  const addedMessage = project.messages[project.messages.length - 1];

  await Promise.all(
    project.members
      .filter((member) => member.userId.toString() !== userId.toString())
      .map((member) =>
        createNotificationAndNotify({
          userId: member.userId,
          type: "project.message",
          payload: {
            projectId: project._id,
            projectTitle: project.title,
            senderId: userId,
          },
        })
      )
  );

  return addedMessage;
};

export const listProjectMessages = async ({ projectId, userId, limit = 50, cursor = null }) => {
  const project = await projectRepo.findProjectById(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  if (!project.isMember(userId)) {
    throw new AppError({ message: "Only members can view messages", statusCode: 403 });
  }

  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

  await project.populate("messages.senderId", "firstName lastName photoUrl");

  let messages = project.messages.sort((a, b) => b.createdAt - a.createdAt);

  if (cursor) {
    const cursorIndex = messages.findIndex((m) => m._id.toString() === cursor);
    if (cursorIndex !== -1) {
      messages = messages.slice(cursorIndex + 1);
    }
  }

  const hasMore = messages.length > pageSize;
  const sliced = hasMore ? messages.slice(0, pageSize) : messages;
  const nextCursor = hasMore ? sliced[sliced.length - 1]._id : null;

  return {
    messages: sliced.reverse(),
    nextCursor,
    hasMore,
  };
};

export const deleteAllProjects = async ({ user }) => {
  if (!user.isAdmin) {
    throw new AppError({ message: "Admin only", statusCode: 403 });
  }
  const result = await projectRepo.deleteAllProjects();
  return { deleted: result.deletedCount };
};

export const updateProject = async ({ projectId, userId, title, description, techStack, status }) => {
  const project = await projectRepo.findProjectById(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  const role = project.getUserRole(userId);
  if (!["owner", "admin"].includes(role)) {
    throw new AppError({ message: "Access denied. Only owner or admin can edit the project.", statusCode: 403 });
  }

  if (title) project.title = title;
  if (description) project.description = description;
  if (techStack) project.techStack = techStack;
  if (status) project.status = status;

  await projectRepo.saveProject(project);
  return project;
};

export const deleteProject = async ({ projectId, userId }) => {
  const project = await projectRepo.findProjectById(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  const role = project.getUserRole(userId);
  if (!["owner", "admin"].includes(role)) {
    throw new AppError({ message: "Access denied. Only owner or admin can delete the project.", statusCode: 403 });
  }

  await projectRepo.deleteProjectById(projectId);
  return { message: "Project deleted successfully" };
};

export default {
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
};
