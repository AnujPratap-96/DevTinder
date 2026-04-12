const express = require("express");
const userRouter = express.Router();
const mongoose = require("mongoose");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const Bookmark = require("../models/bookmark");
const User = require("../models/user");
const asyncHandler = require("express-async-handler");
const { haversineDistanceKm } = require("../utils/location");

const SAFE_DATA = [
  "firstName",
  "lastName",
  "photoUrl",
  "about",
  "age",
  "gender",
  "skills",
  "role",
  "experienceYears",
  "availability",
  "githubProfile",
];

const buildConnectionExclusionSet = (connections, loggedInUserId) => {
  const ids = new Set([loggedInUserId.toString()]);
  connections.forEach((row) => {
    ids.add(row.fromUserId.toString());
    ids.add(row.toUserId.toString());
  });
  return ids;
};

const computeMatchScore = (loggedInUser, candidate) => {
  let score = 0;

  const userSkills = new Set((loggedInUser.skills ?? []).map((skill) => skill.toLowerCase()));
  const candidateSkills = new Set((candidate.skills ?? []).map((skill) => skill.toLowerCase()));
  const commonSkills = [...candidateSkills].filter((skill) => userSkills.has(skill));
  score += Math.min(commonSkills.length * 15, 45);

  if (candidate.role && candidate.role === loggedInUser.role) {
    score += 15;
  }

  const expDelta = Math.abs((candidate.experienceYears ?? 0) - (loggedInUser.experienceYears ?? 0));
  score += Math.max(0, 20 - expDelta * 4);

  if (candidate.availability === "open") {
    score += 10;
  }

  if (candidate.distanceKm !== undefined && candidate.distanceKm <= 25) {
    score += 10;
  }

  return Math.min(score, 100);
};

const mapCandidate = (loggedInUser, candidateDoc) => {
  const candidate = { ...candidateDoc };
  if (candidate.distanceMeters !== undefined) {
    candidate.distanceKm = Number((candidate.distanceMeters / 1000).toFixed(2));
  } else if (candidate.location?.coordinates && loggedInUser.location?.coordinates) {
    const distance = haversineDistanceKm(
      candidate.location.coordinates,
      loggedInUser.location.coordinates
    );
    candidate.distanceKm = distance ? Number(distance.toFixed(2)) : undefined;
  }

  const score = computeMatchScore(loggedInUser, candidate);
  candidate.matchScore = score;
  candidate.recommended = score >= 60;
  delete candidate.distanceMeters;
  return candidate;
};

userRouter.get("/user/requests/received", userAuth, asyncHandler(async (req, res) => {
    const loggedInUser = req.user;
    const requests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", SAFE_DATA);
    //? .populate("fromUserId" , "firstName lastName photoUrl about")
    res.status(200).json({ message: "Requests fetched successfully", requests });
}));

userRouter.get("/user/connections", userAuth, asyncHandler(async (req, res) => {
    const loggedInUser = req.user;
    const connections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id, status: "accepted" },
        { toUserId: loggedInUser._id, status: "accepted" },
      ],
    })
      .populate("fromUserId", SAFE_DATA)
      .populate("toUserId", SAFE_DATA);
    if (connections.length === 0) {
      return res.json({ message: "No connections found" });
    }
    const data = connections.map((row) => {
      if (row.fromUserId._id.equals(loggedInUser._id)) return row.toUserId;
      return row.fromUserId;
    });
    res.json({ message: "Connections fetched successfully", data });
}));

const baseFeedHandler = async (req, res) => {
    const loggedInUser = await User.findById(req.user._id).lean();
    let limit = parseInt(req.query.limit, 10) || 10;
    limit = Math.min(limit, 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const lat = req.query.lat ? Number(req.query.lat) : null;
    const lng = req.query.lng ? Number(req.query.lng) : null;
    const radius = req.query.radius ? Number(req.query.radius) : null;

    const existingConnections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id },
        { toUserId: loggedInUser._id },
      ],
    }).select("fromUserId toUserId");

    const excludedIds = buildConnectionExclusionSet(existingConnections, loggedInUser._id);
    (loggedInUser.blockedUsers ?? []).forEach((id) => excludedIds.add(id.toString()));

    const excludedObjectIds = Array.from(excludedIds).map((id) =>
      new mongoose.Types.ObjectId(id)
    );

    const geoStage = lat !== null && lng !== null ? (() => {
      const stage = {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distanceMeters",
          spherical: true,
        },
      };
      if (radius) {
        stage.$geoNear.maxDistance = radius * 1000;
      }
      return [stage];
    })() : [];

    const pipeline = [
      ...geoStage,
      {
        $match: {
          _id: { $nin: excludedObjectIds },
          availability: { $ne: "not_looking" },
          blockedUsers: { $ne: loggedInUser._id },
          isBanned: { $ne: true },
        },
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          photoUrl: 1,
          about: 1,
          age: 1,
          gender: 1,
          skills: 1,
          role: 1,
          experienceYears: 1,
          availability: 1,
          githubProfile: 1,
          location: 1,
          distanceMeters: 1,
        },
      },
      { $skip: skip },
      { $limit: limit * 2 },
    ];

    const candidates = await User.aggregate(pipeline);
    const scored = candidates
      .map((candidate) => mapCandidate(loggedInUser, candidate))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, limit);

    res.status(200).json({
      message: "Feed fetched successfully",
      page,
      limit,
      users: scored,
    });
  };

userRouter.get("/user/feed", userAuth, asyncHandler(baseFeedHandler));
userRouter.get("/feed", userAuth, asyncHandler(baseFeedHandler));

userRouter.get("/users", userAuth, asyncHandler(async (req, res) => {
  const loggedInUser = await User.findById(req.user._id).lean();

  const { role, availability, skills, minExperience, maxExperience, lat, lng, radius } = req.query ?? {};

  const matchStage = {
    _id: { $ne: loggedInUser._id },
    blockedUsers: { $ne: loggedInUser._id },
    isBanned: { $ne: true },
  };

  if (role) {
    matchStage.role = role;
  }
  if (availability) {
    matchStage.availability = availability;
  }

  const skillList = typeof skills === "string" ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (skillList.length) {
    matchStage.skills = { $all: skillList };
  }

  const expFilters = [];
  if (minExperience !== undefined) {
    expFilters.push({ experienceYears: { $gte: Number(minExperience) } });
  }
  if (maxExperience !== undefined) {
    expFilters.push({ experienceYears: { $lte: Number(maxExperience) } });
  }

  const geoStage = lat && lng ? (() => {
    const stage = {
      $geoNear: {
        near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        distanceField: "distanceMeters",
        spherical: true,
      },
    };
    if (radius) {
      stage.$geoNear.maxDistance = Number(radius) * 1000;
    }
    return [stage];
  })() : [];

  const pipeline = [
    ...geoStage,
    { $match: matchStage },
  ];

  if (expFilters.length) {
    pipeline.push({ $match: { $and: expFilters } });
  }

  pipeline.push(
    {
      $project: {
        firstName: 1,
        lastName: 1,
        photoUrl: 1,
        about: 1,
        age: 1,
        gender: 1,
        skills: 1,
        role: 1,
        experienceYears: 1,
        availability: 1,
        githubProfile: 1,
        location: 1,
        distanceMeters: 1,
      },
    },
    { $limit: 100 },
  );

  const results = await User.aggregate(pipeline);
  const mapped = results.map((candidate) => mapCandidate(loggedInUser, candidate));

  res.status(200).json({ users: mapped });
}));

userRouter.get("/bookmarks", userAuth, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const bookmarks = await Bookmark.find({ userId })
    .populate("savedUserId", SAFE_DATA.join(" "))
    .lean();
  res.status(200).json({ bookmarks });
}));

module.exports = userRouter;
