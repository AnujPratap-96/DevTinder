import mongoose from "mongoose";

import Project from "../models/project.js";
import Notification from "../models/notification.js";
import { AppError, ValidationError } from "../errors/index.js";

const getMemberUserId = (member) => (typeof member === "object" ? member?.userId : member);
const getRequestUserId = (req) => (typeof req?.userId === "object" ? req?.userId : req?.userId);

export const createProject = async ({ ownerId, title, description, techStack }) => {
  if (!title || !description) {
    throw new ValidationError("title and description are required");
  }

  const project = await Project.create({
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

export const listProjects = async ({ status, userId }) => {
  const filter = {};
  if (status && ["open", "in_progress", "completed"].includes(status)) {
    filter.status = status;
  }

  const projects = await Project.find(filter)
    .populate("ownerId", "firstName lastName photoUrl role")
    .populate("members.userId", "firstName lastName photoUrl role")
    .populate("joinRequests.userId", "firstName lastName photoUrl")
    .sort({ createdAt: -1 })
    .lean();

  return projects.map((project) => {
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
  });
};

export const listMyProjects = async (userId) => {
  return Project.find({ "members.userId": userId })
    .populate("ownerId", "firstName lastName photoUrl role")
    .populate("members.userId", "firstName lastName photoUrl role")
    .sort({ createdAt: -1 })
    .lean();
};

export const requestProjectJoin = async ({ projectId, userId }) => {
  if (!projectId || !mongoose.isValidObjectId(projectId)) {
    throw new ValidationError("Valid projectId is required");
  }

  const project = await Project.findById(projectId);
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
  await project.save();

  await Notification.create({
    userId: project.ownerId,
    type: "project.join_request",
    payload: {
      projectId: project._id,
      projectTitle: project.title,
      requesterId: userId,
    },
  });

  return { message: "Join request sent" };
};

export const listProjectRequests = async ({ projectId, userId }) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  const userRole = project.getUserRole(userId);
  if (!userRole || !["owner", "admin"].includes(userRole)) {
    throw new AppError({ message: "Only owners/admins can view requests", statusCode: 403 });
  }

  await Project.populate(project, {
    path: "joinRequests.userId",
    select: "firstName lastName photoUrl role",
  });

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

  const project = await Project.findById(projectId);
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
    await Notification.create({
      userId: request.userId,
      type: "project.request_accepted",
      payload: {
        projectId: project._id,
               projectTitle: project.title,
      },
    });
  } else {
    await Notification.create({
      userId: request.userId,
      type: "project.request_rejected",
      payload: {
        projectId: project._id,
        projectTitle: project.title,
      },
    });
  }

  await project.save();

  project.joinRequests = project.joinRequests.filter((r) => r._id.toString() !== requestId);
  await project.save();
  await project.populate("ownerId", "firstName lastName photoUrl");
  await project.populate("members.userId", "firstName lastName photoUrl role");

  return project;
};

export const removeProjectMember = async ({ projectId, memberId, userId }) => {
  const project = await Project.findById(projectId);
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
  await project.save();

  await Notification.create({
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
  const project = await Project.findById(projectId)
    .populate("ownerId", "firstName lastName photoUrl role githubProfile")
    .populate("members.userId", "firstName lastName photoUrl role availability")
    .populate("joinRequests.userId", "firstName lastName photoUrl");

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

  const project = await Project.findById(projectId);
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
  await project.save();

  await project.populate("messages.senderId", "firstName lastName photoUrl");
  const addedMessage = project.messages[project.messages.length - 1];

  await Promise.all(
    project.members
      .filter((member) => member.userId.toString() !== userId.toString())
      .map((member) =>
        Notification.create({
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

export const listProjectMessages = async ({ projectId, userId, page = 1, limit = 50 }) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  if (!project.isMember(userId)) {
    throw new AppError({ message: "Only members can view messages", statusCode: 403 });
  }

  const numericPage = parseInt(page, 10);
  const numericLimit = parseInt(limit, 10);
  const skip = (numericPage - 1) * numericLimit;
  const totalMessages = project.messages.length;

  await project.populate("messages.senderId", "firstName lastName photoUrl");

  const messages = project.messages
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(skip, skip + numericLimit)
    .reverse();

  return {
    messages,
    page: numericPage,
    limit: numericLimit,
    total: totalMessages,
    hasMore: skip + messages.length < totalMessages,
  };
};

export const deleteAllProjects = async ({ user }) => {
  if (!user.isAdmin) {
    throw new AppError({ message: "Admin only", statusCode: 403 });
  }
  const result = await Project.deleteMany({});
  return { deleted: result.deletedCount };
};

export const updateProject = async ({ projectId, userId, title, description, techStack, status }) => {
  const project = await Project.findById(projectId);
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

  await project.save();
  return project;
};

export const deleteProject = async ({ projectId, userId }) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError("Project");
  }

  const role = project.getUserRole(userId);
  if (!["owner", "admin"].includes(role)) {
    throw new AppError({ message: "Access denied. Only owner or admin can delete the project.", statusCode: 403 });
  }

  await Project.findByIdAndDelete(projectId);
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
