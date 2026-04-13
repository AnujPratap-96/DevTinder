const express = require("express");
const mongoose = require("mongoose");
const { userAuth } = require("../middlewares/auth");
const Project = require("../models/project");
const Notification = require("../models/notification");

const getMemberUserId = (member) => (typeof member === "object" ? member?.userId : member);
const getRequestUserId = (req) => (typeof req?.userId === "object" ? req?.userId : req?.userId);

const projectRouter = express.Router();

projectRouter.post("/project", userAuth, async (req, res) => {
  const { title, description, techStack } = req.body ?? {};
  const ownerId = req.user._id;

  if (!title || !description) {
    return res.status(400).json({ message: "title and description are required" });
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
  res.status(201).json({ project });
});

projectRouter.get("/projects", userAuth, async (req, res) => {
  const { status } = req.query ?? {};
  const userId = req.user._id;
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

  const projectsWithAccess = projects.map((project) => {
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

  res.status(200).json({ projects: projectsWithAccess });
});

projectRouter.get("/project/my", userAuth, async (req, res) => {
  const userId = req.user._id;

  const projects = await Project.find({
    "members.userId": userId,
  })
    .populate("ownerId", "firstName lastName photoUrl role")
    .populate("members.userId", "firstName lastName photoUrl role")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ projects });
});

projectRouter.post("/project/request", userAuth, async (req, res) => {
  const { projectId } = req.body ?? {};
  const userId = req.user._id;

  if (!projectId || !mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({ message: "Valid projectId is required" });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (project.isMember(userId)) {
    return res.status(400).json({ message: "Already a member" });
  }

  if (project.hasPendingRequest(userId)) {
    return res.status(400).json({ message: "Join request already pending" });
  }

  if (!project.joinRequests) {
    project.joinRequests = [];
  }
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

  res.status(200).json({ message: "Join request sent" });
});

projectRouter.get("/project/:projectId/requests", userAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user._id;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  const userRole = project.getUserRole(userId);
  if (!userRole || !["owner", "admin"].includes(userRole)) {
    return res.status(403).json({ message: "Only owners/admins can view requests" });
  }

  const pendingRequests = project.joinRequests
    .filter((r) => r.status === "pending")
    .map((r) => r.userId)
    .filter(Boolean);

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

  res.status(200).json({ requests });
});

projectRouter.post("/project/request/respond", userAuth, async (req, res) => {
  const { projectId, requestId, action } = req.body ?? {};
  const userId = req.user._id;

  if (!projectId || !requestId || !action) {
    return res.status(400).json({ message: "projectId, requestId, and action are required" });
  }

  if (!["accept", "reject"].includes(action)) {
    return res.status(400).json({ message: "action must be accept or reject" });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  const userRole = project.getUserRole(userId);
  if (!userRole || !["owner", "admin"].includes(userRole)) {
    return res.status(403).json({ message: "Only owners/admins can respond to requests" });
  }

  const request = project.joinRequests.id(requestId);
  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }

  if (request.status !== "pending") {
    return res.status(400).json({ message: "Request already processed" });
  }

  request.status = action === "accept" ? "accepted" : "rejected";
  request.respondedAt = new Date();
  request.respondedBy = userId;

  if (action === "accept") {
    project.members.push({
      userId: request.userId,
      role: "member",
    });

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

  project.joinRequests = project.joinRequests.filter(
    (r) => r._id.toString() !== requestId
  );
  await project.save();
  await project.populate("ownerId", "firstName lastName photoUrl");
  await project.populate("members.userId", "firstName lastName photoUrl role");

  res.status(200).json({ project, message: `Request ${action}ed` });
});

projectRouter.delete("/project/:projectId/member/:memberId", userAuth, async (req, res) => {
  const { projectId, memberId } = req.params;
  const userId = req.user._id;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  const userRole = project.getUserRole(userId);
  if (!userRole || !["owner", "admin"].includes(userRole)) {
    return res.status(403).json({ message: "Only owners/admins can remove members" });
  }

  if (!mongoose.isValidObjectId(memberId)) {
    return res.status(400).json({ message: "Invalid memberId" });
  }

  const memberIndex = project.members.findIndex((m) => {
    const mid = getMemberUserId(m);
    return mid?.toString() === memberId;
  });

  if (memberIndex === -1) {
    return res.status(404).json({ message: "Member not found" });
  }

  const member = project.members[memberIndex];
  if (member.role === "owner") {
    return res.status(400).json({ message: "Cannot remove owner" });
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

  res.status(200).json({ message: "Member removed" });
});

projectRouter.get("/project/:projectId", userAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user._id;

  const project = await Project.findById(projectId)
    .populate("ownerId", "firstName lastName photoUrl role githubProfile")
    .populate("members.userId", "firstName lastName photoUrl role availability")
    .populate("joinRequests.userId", "firstName lastName photoUrl");

  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  const userRole = project.getUserRole(userId);
  const isMember = project.isMember(userId);

  if (!isMember && project.status !== "open") {
    return res.status(403).json({ message: "Project is no longer open for joining" });
  }

  const response = {
    ...project.toObject(),
    userRole,
    isMember,
    joinRequests: isMember && userRole
      ? project.joinRequests.map((r) => ({
          _id: r._id,
          user: r.userId,
          status: r.status,
          requestedAt: r.requestedAt,
        }))
      : [],
  };

  res.status(200).json({ project: response });
});

projectRouter.post("/project/:projectId/message", userAuth, async (req, res) => {
  const { projectId } = req.params;
  const { message, mentions } = req.body ?? {};
  const userId = req.user._id;

  if (!message?.trim()) {
    return res.status(400).json({ message: "message is required" });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (!project.isMember(userId)) {
    return res.status(403).json({ message: "Only members can post messages" });
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

  project.members.forEach(async (member) => {
    if (member.userId.toString() !== userId.toString()) {
      await Notification.create({
        userId: member.userId,
        type: "project.message",
        payload: {
          projectId: project._id,
          projectTitle: project.title,
          senderId: userId,
        },
      });
    }
  });

  res.status(201).json({ message: addedMessage });
});

projectRouter.get("/project/:projectId/messages", userAuth, async (req, res) => {
  const { projectId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const userId = req.user._id;

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (!project.isMember(userId)) {
    return res.status(403).json({ message: "Only members can view messages" });
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const totalMessages = project.messages.length;

  await project.populate("messages.senderId", "firstName lastName photoUrl");

  const messages = project.messages
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(skip, skip + parseInt(limit, 10))
    .reverse();

  res.status(200).json({
    messages,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    total: totalMessages,
    hasMore: skip + messages.length < totalMessages,
  });
});

projectRouter.delete("/project/delete-all", userAuth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Admin only" });
  }
  const result = await Project.deleteMany({});
  res.status(200).json({ message: "All projects deleted", deleted: result.deletedCount });
});

projectRouter.patch("/project/:projectId", userAuth, async (req, res) => {
  const { projectId } = req.params;
  const { title, description, techStack, status } = req.body ?? {};
  const userId = req.user._id;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: "Project not found" });

  const role = project.getUserRole(userId);
  if (!["owner", "admin"].includes(role)) {
    return res.status(403).json({ message: "Access denied. Only owner or admin can edit the project." });
  }

  if (title) project.title = title;
  if (description) project.description = description;
  if (techStack) project.techStack = techStack;
  if (status) project.status = status;

  await project.save();
  res.status(200).json({ project, message: "Project updated successfully" });
});

projectRouter.delete("/project/:projectId", userAuth, async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user._id;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: "Project not found" });

  const role = project.getUserRole(userId);
  if (!["owner", "admin"].includes(role)) {
    return res.status(403).json({ message: "Access denied. Only owner or admin can delete the project." });
  }

  await Project.findByIdAndDelete(projectId);
  res.status(200).json({ message: "Project deleted successfully" });
});

module.exports = projectRouter;