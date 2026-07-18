import mongoose from "mongoose";
import {
  findConnectionRequests,
  populateConnectionRequests,
  findConnectionRequest,
} from "../repositories/connectionRequest.repository.js";
import { findBookmarks } from "../repositories/bookmark.repository.js";
import {
  aggregateUsers,
  createObjectId,
  findUserById,
  findUsers,
  saveUser,
} from "../repositories/user.repository.js";
import { findChatsByParticipant } from "../repositories/chat.repository.js";
import Report from "../models/report.js";
import { haversineDistanceKm } from "../utils/location.js";
import {
  USER_SAFE_FIELDS,
  DEFAULT_FEED_LIMIT,
  MAX_FEED_LIMIT,
  MAX_USER_FETCH_LIMIT,
} from "../constants/user.constants.js";
import { AppError, ValidationError, NotFoundError } from "../errors/index.js";

const buildConnectionExclusionSet = (connections, loggedInUserId) => {
  const ids = new Set([loggedInUserId.toString()]);
  connections.forEach((row) => {
    ids.add(row.fromUserId.toString());
    ids.add(row.toUserId.toString());
  });
  return ids;
};

// IDs the given user must never see: users they blocked, users they reported,
// and users who blocked them.
const getHiddenUserIds = async (userId) => {
  const hidden = new Set();

  const me = await findUserById(userId).select("blockedUsers");
  (me?.blockedUsers ?? []).forEach((id) => hidden.add(id.toString()));

  const reported = await Report.find({ reporterId: userId })
    .select("reportedUserId")
    .lean();
  reported.forEach((r) => hidden.add(r.reportedUserId.toString()));

  const blockers = await findUsers({ blockedUsers: userId }, "_id").lean();
  blockers.forEach((u) => hidden.add(u._id.toString()));

  return hidden;
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

export const getReceivedRequests = async (userId) => {
  const requests = await populateConnectionRequests(
    findConnectionRequests({
      toUserId: userId,
      status: "interested",
    }),
    USER_SAFE_FIELDS
  ).lean();

  const hidden = await getHiddenUserIds(userId);
  return requests.filter(
    (req) => req.fromUserId && !hidden.has(req.fromUserId._id.toString())
  );
};

export const getConnections = async (userId) => {
  const connections = await populateConnectionRequests(
    findConnectionRequests({
      $or: [
        { fromUserId: userId, status: "accepted" },
        { toUserId: userId, status: "accepted" },
      ],
    }),
    USER_SAFE_FIELDS
  ).lean();

  if (!connections.length) {
    return [];
  }

  const hidden = await getHiddenUserIds(userId);

  const chats = await findChatsByParticipant(userId);
  const visible = [];

  for (const row of connections) {
    const fromId = row.fromUserId?._id;
    const toId = row.toUserId?._id;
    // Skip orphaned requests where a participant user no longer exists.
    if (!fromId || !toId) continue;

    const targetUser = fromId.equals(userId) ? row.toUserId : row.fromUserId;
    if (hidden.has(targetUser._id.toString())) continue;

    const chat = chats.find(
      (c) =>
        c.participants.some((p) => p.toString() === targetUser._id.toString()) &&
        c.participants.some((p) => p.toString() === userId.toString())
    );
    const targetData = targetUser.toObject ? targetUser.toObject() : targetUser;
    visible.push({
      ...targetData,
      unreadCount:
        chat?.unreadCounts?.get?.(userId.toString()) || chat?.unreadCounts?.[userId.toString()] || 0,
      lastMessageAt: chat?.lastMessageAt || null,
      matchId: chat?._id || null,
    });
  }

  return visible;
};

const buildGeoStage = (lat, lng, radius) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return [];
  }
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
};

export const getFeed = async (loggedInUser, query) => {
  let limit = parseInt(query.limit, 10) || DEFAULT_FEED_LIMIT;
  limit = Math.min(limit, MAX_FEED_LIMIT);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const skip = (page - 1) * limit;

  const lat = query.lat ? Number(query.lat) : null;
  const lng = query.lng ? Number(query.lng) : null;
  const radius = query.radius ? Number(query.radius) : null;

  const existingConnections = await findConnectionRequests({
    $or: [
      { fromUserId: loggedInUser._id },
      { toUserId: loggedInUser._id },
    ],
  }).select("fromUserId toUserId");

  const excludedIds = buildConnectionExclusionSet(existingConnections, loggedInUser._id);
  (loggedInUser.blockedUsers ?? []).forEach((id) => excludedIds.add(id.toString()));

  const reported = await Report.find({ reporterId: loggedInUser._id })
    .select("reportedUserId")
    .lean();
  reported.forEach((r) => excludedIds.add(r.reportedUserId.toString()));

  const excludedObjectIds = Array.from(excludedIds).map((id) => createObjectId(id));

  const pipeline = [
    ...buildGeoStage(lat, lng, radius),
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
        isOnline: 1,
        lastSeenAt: 1,
        socialLinks: 1,
      },
    },
    { $skip: skip },
    { $limit: limit * 2 },
  ];

  const candidates = await aggregateUsers(pipeline);
  const scored = candidates
    .map((candidate) => mapCandidate(loggedInUser, candidate))
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, limit);

  return {
    page,
    limit,
    users: scored,
  };
};

export const getUsersWithFilters = async (loggedInUser, query) => {
  const {
    role,
    availability,
    skills,
    minExperience,
    maxExperience,
    lat,
    lng,
    radius,
  } = query ?? {};

  const matchStage = {
    _id: { $ne: loggedInUser._id },
    blockedUsers: { $ne: loggedInUser._id },
    isBanned: { $ne: true },
  };

  const hidden = await getHiddenUserIds(loggedInUser._id);
  if (hidden.size) {
    matchStage._id = { $ne: loggedInUser._id, $nin: Array.from(hidden) };
  }

  if (role) matchStage.role = role;
  if (availability) matchStage.availability = availability;

  const skillList = typeof skills === "string" ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (skillList.length) matchStage.skills = { $all: skillList };

  const expFilters = [];
  if (minExperience !== undefined) {
    expFilters.push({ experienceYears: { $gte: Number(minExperience) } });
  }
  if (maxExperience !== undefined) {
    expFilters.push({ experienceYears: { $lte: Number(maxExperience) } });
  }

  const pipeline = [
    ...buildGeoStage(
      lat ? Number(lat) : null,
      lng ? Number(lng) : null,
      radius ? Number(radius) : null
    ),
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
        isOnline: 1,
        lastSeenAt: 1,
        socialLinks: 1,
      },
    },
    { $limit: MAX_USER_FETCH_LIMIT }
  );

  const results = await aggregateUsers(pipeline);
  return results.map((candidate) => mapCandidate(loggedInUser, candidate));
};

export const searchUsers = async (loggedInUser, query) => {
  const { q, role, minExperience, maxExperience } = query;

  const matchStage = {
    _id: { $ne: loggedInUser._id },
    blockedUsers: { $ne: loggedInUser._id },
    isBanned: { $ne: true },
  };

  const hidden = await getHiddenUserIds(loggedInUser._id);
  if (hidden.size) {
    matchStage._id = { $ne: loggedInUser._id, $nin: Array.from(hidden) };
  }

  if (q && q.trim()) {
    const searchRegex = new RegExp(q.trim(), "i");
    matchStage.$or = [
      { firstName: { $regex: searchRegex } },
      { lastName: { $regex: searchRegex } },
      { skills: { $regex: searchRegex } },
    ];
  }

  if (role) {
    matchStage.role = role;
  }

  const expFilters = [];
  if (minExperience !== undefined) {
    expFilters.push({ experienceYears: { $gte: Number(minExperience) } });
  }
  if (maxExperience !== undefined) {
    expFilters.push({ experienceYears: { $lte: Number(maxExperience) } });
  }

  const pipeline = [{ $match: matchStage }];

  if (expFilters.length) {
    pipeline.push({ $match: { $and: expFilters } });
  }

  pipeline.push({ $sort: { firstName: 1 } }, { $limit: 20 });

  pipeline.push({
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
      socialLinks: 1,
      location: 1,
      isOnline: 1,
      lastSeenAt: 1,
    },
  });

  const results = await aggregateUsers(pipeline);

  const targetIds = results.map((r) => r._id);
  const relevantRequests = await findConnectionRequests({
    $or: [
      { fromUserId: loggedInUser._id, toUserId: { $in: targetIds } },
      { toUserId: loggedInUser._id, fromUserId: { $in: targetIds } },
    ],
  })
    .lean();

  return results.map((candidate) => {
    const mappedCandidate = mapCandidate(loggedInUser, candidate);
    const request = relevantRequests.find(
      (r) =>
        (r.fromUserId.toString() === loggedInUser._id.toString() &&
          r.toUserId.toString() === candidate._id.toString()) ||
        (r.toUserId.toString() === loggedInUser._id.toString() &&
          r.fromUserId.toString() === candidate._id.toString())
    );

    let status = "none";
    if (request) {
      if (request.status === "accepted") {
        status = "connected";
      } else if (request.status === "interested") {
        status =
          request.fromUserId.toString() === loggedInUser._id.toString()
            ? "pending_sent"
            : "pending_received";
      }
    }
    mappedCandidate.relationshipStatus = status;
    return mappedCandidate;
  });
};

export const getBookmarksForUser = async (userId) => {
  const bookmarks = await findBookmarks({ userId })
    .populate("savedUserId", USER_SAFE_FIELDS.join(" "))
    .lean();
  return bookmarks;
};

export const endorseConnection = async (loggedInUser, targetUserId, skill) => {
  if (!targetUserId || !skill) {
    throw new ValidationError("Target user and skill are required");
  }

  if (targetUserId === loggedInUser._id.toString()) {
    throw new ValidationError("You cannot endorse yourself");
  }

  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new ValidationError("Invalid target user id");
  }

  const targetUser = await findUserById(targetUserId);
  if (!targetUser) {
    throw new AppError({
      message: "User not found",
      statusCode: 404,
      errorCode: "USER_NOT_FOUND",
    });
  }

  const isConnected = await findConnectionRequest({
    $or: [
      { fromUserId: loggedInUser._id, toUserId: targetUserId, status: "accepted" },
      { fromUserId: targetUserId, toUserId: loggedInUser._id, status: "accepted" },
    ],
  });

  if (!isConnected) {
    throw new AppError({
      message: "You can only endorse your connections",
      statusCode: 403,
      errorCode: "ENDORSE_NOT_ALLOWED",
    });
  }

  targetUser.endorsements = targetUser.endorsements || [];

  const endorsement = targetUser.endorsements.find(
    (item) => item.skill.toLowerCase() === skill.toLowerCase()
  );

  if (!endorsement) {
    targetUser.endorsements.push({ skill, endorsers: [loggedInUser._id] });
  } else {
    const alreadyEndorsed = endorsement.endorsers.some(
      (id) => id.toString() === loggedInUser._id.toString()
    );
    if (alreadyEndorsed) {
      throw new ValidationError("Already endorsed for this skill");
    }
    endorsement.endorsers.push(loggedInUser._id);
  }

  await saveUser(targetUser);
  return {
    endorsements: targetUser.endorsements,
    targetUser,
  };
};

// ── End-to-end encryption key exchange ──────────────────────────────────────
// The private key never reaches the server. We only store the public key so
// other participants can derive a shared conversation secret client-side.
export const savePublicKey = async ({ userId, publicKey, keyVersion = 1 }) => {
  if (!publicKey || typeof publicKey !== "string") {
    throw new ValidationError("publicKey is required");
  }
  const user = await findUserById(userId);
  if (!user) {
    throw new NotFoundError("User");
  }
  user.publicKey = publicKey;
  user.keyVersion = keyVersion;
  await saveUser(user);
  return { keyVersion: user.keyVersion };
};

export const getPublicKey = async ({ userId }) => {
  const user = await findUserById(userId).lean();
  if (!user) {
    throw new NotFoundError("User");
  }
  return { publicKey: user.publicKey, keyVersion: user.keyVersion ?? 0 };
};
