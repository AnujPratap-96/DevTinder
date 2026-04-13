/**
 * aiRouter.js
 * All AI-powered endpoints.  Each route:
 *   1. Authenticates the user (userAuth)
 *   2. Applies per-user rate limiting (aiRateLimit)
 *   3. Validates & sanitises input
 *   4. Delegates to aiService (no AI logic here)
 *   5. Returns structured { success, data } responses
 */

const express = require("express");
const asyncHandler = require("express-async-handler");
const { userAuth } = require("../middlewares/auth");
const aiRateLimit = require("../middlewares/aiRateLimit");
const User = require("../models/user");
const {
  generateBio,
  suggestSkills,
  generateIcebreaker,
  explainMatch,
} = require("../services/aiService");

const aiRouter = express.Router();

// ─── Shared guard: all AI routes need auth + rate limit ──────
const aiGuard = [userAuth, aiRateLimit];

// ─────────────────────────────────────────────────────────────
// POST /ai/bio
// Body: { skills?, experienceYears?, role?, interests? }
// Generates a professional developer bio
// ─────────────────────────────────────────────────────────────
aiRouter.post(
  "/ai/bio",
  ...aiGuard,
  asyncHandler(async (req, res) => {
    const { skills, experienceYears, role, interests } = req.body ?? {};

    // Fall back to the logged-in user's profile data if body is sparse
    const user = req.user;
    const payload = {
      skills: skills ?? user.skills,
      experienceYears: experienceYears ?? user.experienceYears,
      role: role ?? user.role,
      interests,
    };

    if (!payload.skills?.length && !payload.role) {
      return res.status(400).json({
        success: false,
        message: "Provide at least skills or role to generate a bio.",
      });
    }

    const bio = await generateBio(payload);
    return res.status(200).json({ success: true, data: { bio } });
  })
);

// ─────────────────────────────────────────────────────────────
// POST /ai/skills
// Body: { currentSkills?, role? }
// Suggests in-demand skills based on current stack
// ─────────────────────────────────────────────────────────────
aiRouter.post(
  "/ai/skills",
  ...aiGuard,
  asyncHandler(async (req, res) => {
    const { currentSkills, role, about } = req.body ?? {};
    const user = req.user;

    const payload = {
      currentSkills: currentSkills ?? user.skills,
      role: role ?? user.role,
      about: about ?? user.about,
    };

    const suggestions = await suggestSkills(payload);
    return res.status(200).json({ success: true, data: { suggestions } });
  })
);

// ─────────────────────────────────────────────────────────────
// POST /ai/icebreaker
// Body: { receiverId }
// Generates a personalised first message to send to a match
// ─────────────────────────────────────────────────────────────
aiRouter.post(
  "/ai/icebreaker",
  ...aiGuard,
  asyncHandler(async (req, res) => {
    const { receiverId } = req.body ?? {};

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "receiverId is required.",
      });
    }

    const receiver = await User.findById(receiverId)
      .select("firstName skills role experienceYears")
      .lean();

    if (!receiver) {
      return res.status(404).json({ success: false, message: "Receiver not found." });
    }

    const sender = req.user;
    const message = await generateIcebreaker({ sender, receiver });
    return res.status(200).json({ success: true, data: { message } });
  })
);

// ─────────────────────────────────────────────────────────────
// POST /ai/match-explanation
// Body: { targetUserId }
// Explains why the current user and a target user are a good match
// ─────────────────────────────────────────────────────────────
aiRouter.post(
  "/ai/match-explanation",
  ...aiGuard,
  asyncHandler(async (req, res) => {
    const { targetUserId } = req.body ?? {};

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "targetUserId is required.",
      });
    }

    const targetUser = await User.findById(targetUserId)
      .select("firstName skills role experienceYears")
      .lean();

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const userA = req.user;
    const points = await explainMatch({ userA, userB: targetUser });
    return res.status(200).json({ success: true, data: { points } });
  })
);

module.exports = aiRouter;
