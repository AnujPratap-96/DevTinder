const express = require("express");
const { Chat } = require("../models/chat");
const { Message } = require("../models/message");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");

const chatRouter = express.Router();

const ensureConnection = async (userId, targetUserId) => {
  const isConnection = await ConnectionRequest.findOne({
    $or: [
      { fromUserId: userId, toUserId: targetUserId, status: "accepted" },
      { toUserId: userId, fromUserId: targetUserId, status: "accepted" },
    ],
  }).lean();
  if (!isConnection) {
    const error = new Error("You are not connected with this user");
    error.statusCode = 403;
    throw error;
  }
};

const ensureParticipant = async (matchId, userId) => {
  const chat = await Chat.findById(matchId).lean();
  if (!chat) {
    const error = new Error("Conversation not found");
    error.statusCode = 404;
    throw error;
  }
  const isParticipant = chat.participants.some((participant) =>
    participant.toString() === userId.toString()
  );
  if (!isParticipant) {
    const error = new Error("You are not part of this conversation");
    error.statusCode = 403;
    throw error;
  }
  return chat;
};

const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit ?? "20", 10), 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  const { targetUserId } = req.params;
  const userId = req.user._id;

  if (!userId || !targetUserId) {
    return res.status(400).json({ message: "userId and targetUserId are required" });
  }

  try {
    await ensureConnection(userId, targetUserId);

    const chat = await Chat.findOrCreateByParticipants(userId, targetUserId);
    const { limit } = parsePagination(req);
    const messages = await Message.find({ matchId: chat._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      chat: {
        matchId: chat._id,
        participants: chat.participants,
        lastMessageAt: chat.lastMessageAt,
      },
      messages: messages.reverse(),
    });
  } catch (error) {
    const status = error.statusCode ?? 500;
    res.status(status).json({ message: error.message ?? "Internal Server Error" });
  }
});

chatRouter.get("/messages/:matchId", userAuth, async (req, res) => {
  const { matchId } = req.params;
  const userId = req.user._id;

  try {
    await ensureParticipant(matchId, userId);
    const { limit, skip, page } = parsePagination(req);

    const [messages, total] = await Promise.all([
      Message.find({ matchId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ matchId }),
    ]);

    res.status(200).json({
      page,
      limit,
      total,
      hasMore: skip + messages.length < total,
      messages: messages.reverse(),
    });
  } catch (error) {
    const status = error.statusCode ?? 500;
    res.status(status).json({ message: error.message ?? "Internal Server Error" });
  }
});

chatRouter.patch("/messages/seen", userAuth, async (req, res) => {
  const { matchId } = req.body;
  const userId = req.user._id;

  if (!matchId) {
    return res.status(400).json({ message: "matchId is required" });
  }

  try {
    await ensureParticipant(matchId, userId);

    const result = await Message.markAsSeen({ matchId, receiverId: userId });

    res.status(200).json({
      updated: result.modifiedCount ?? result.nModified ?? 0,
    });
  } catch (error) {
    const status = error.statusCode ?? 500;
    res.status(status).json({ message: error.message ?? "Internal Server Error" });
  }
});

module.exports = chatRouter;


