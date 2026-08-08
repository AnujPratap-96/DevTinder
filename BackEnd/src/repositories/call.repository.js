import CallSession from "../models/callSession.js";

export const createCallSession = (data) => CallSession.create(data);

export const findCallSession = (callId) => CallSession.findOne({ callId });

export const updateCallSession = (callId, data) =>
  CallSession.findOneAndUpdate({ callId }, { $set: data }, { new: true });

export const listCallHistory = (userId, { limit = 20, cursor = null } = {}) => {
  const query = {
    $or: [{ callerId: userId }, { calleeId: userId }],
  };
  if (cursor) query._id = { $lt: cursor };
  return CallSession.find(query).sort({ createdAt: -1 }).limit(limit + 1).lean();
};

export const listMissedCalls = (userId) =>
  CallSession.find({ calleeId: userId, status: "missed", ack: false }).sort({ createdAt: -1 }).lean();

export const findActiveCallForUser = (userId) =>
  CallSession.findOne({
    $or: [{ callerId: userId }, { calleeId: userId }],
    status: { $in: ["ringing", "accepted"] },
  }).lean();
