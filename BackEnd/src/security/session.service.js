import Session from "../models/session.js";
import SECURITY from "./security.config.js";

const sessionsActive = () => SECURITY.enabled && SECURITY.sessions.enabled;

export const createSession = async ({ userId, refreshToken, device = "Unknown device", ip = "" }) => {
  if (!sessionsActive()) return null;
  const expiresAt = new Date(Date.now() + SECURITY.sessions.ttlDays * 24 * 3600000);
  const doc = await Session.create({ userId, refreshToken, device, ip, expiresAt });

  const count = await Session.countDocuments({ userId });
  if (count > SECURITY.sessions.maxPerUser) {
    const overflow = await Session.find({ userId })
      .sort({ lastActiveAt: 1 })
      .limit(count - SECURITY.sessions.maxPerUser)
      .select("_id")
      .lean();
    await Session.deleteMany({ _id: { $in: overflow.map((s) => s._id) } });
  }
  return doc;
};

export const findSessionByRefreshToken = (refreshToken) =>
  Session.findOne({ refreshToken }).lean();

export const rotateSessionToken = async (sessionId, newRefreshToken) =>
  Session.findByIdAndUpdate(
    sessionId,
    { $set: { refreshToken: newRefreshToken, lastActiveAt: new Date() } },
    { new: true }
  );

export const touchSession = async (sessionId) =>
  Session.findByIdAndUpdate(sessionId, { $set: { lastActiveAt: new Date() } });

export const listSessions = async (userId) => {
  if (!sessionsActive()) return { sessions: [], currentSessionId: null };
  const sessions = await Session.find({ userId })
    .sort({ lastActiveAt: -1 })
    .select("_id userId device ip lastActiveAt expiresAt createdAt")
    .lean();
  return { sessions };
};

export const revokeSession = async ({ userId, sessionId, currentRefreshToken = null }) => {
  if (!sessionsActive()) return { revoked: false };
  const session = await Session.findOneAndDelete({ _id: sessionId, userId }).lean();
  const wasCurrent = !!session && !!currentRefreshToken && session.refreshToken === currentRefreshToken;
  return { revoked: !!session, wasCurrent };
};

export const revokeCurrentSession = async ({ userId, refreshToken }) => {
  if (!sessionsActive()) return { revoked: false };
  const session = await Session.findOneAndDelete({ userId, refreshToken }).lean();
  return { revoked: !!session };
};

export default {
  createSession,
  findSessionByRefreshToken,
  rotateSessionToken,
  touchSession,
  listSessions,
  revokeSession,
  revokeCurrentSession,
};
