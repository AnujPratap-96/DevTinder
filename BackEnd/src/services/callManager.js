/**
 * In-memory registry of active calls.
 * Source of truth for "who is currently in a call" so we can reject
 * double-calls and enforce a single active call per user.
 * Stateless across restarts — if the server restarts, in-flight calls end
 * (clients detect socket disconnect and clean up). For multi-instance
 * deployments this should be externalised to Redis.
 */

const activeByCallId = new Map(); // callId -> { callId, callerId, calleeId, type, chatId, status }
const callIdByUser = new Map(); // userId -> callId

export const createCall = ({ callId, callerId, calleeId, type, chatId }) => {
  const callerKey = callerId.toString();
  const calleeKey = calleeId.toString();

  if (callIdByUser.has(callerKey) || callIdByUser.has(calleeKey)) {
    const conflict = callIdByUser.get(callerKey) || callIdByUser.get(calleeKey);
    return { error: "busy", conflict };
  }

  const entry = { callId, callerId: callerKey, calleeId: calleeKey, type, chatId, status: "ringing" };
  activeByCallId.set(callId, entry);
  callIdByUser.set(callerKey, callId);
  callIdByUser.set(calleeKey, callId);
  return { entry };
};

export const getCall = (callId) => activeByCallId.get(callId) || null;

export const isUserInCall = (userId) => callIdByUser.has(userId.toString());

export const getActiveCallIdForUser = (userId) => callIdByUser.get(userId.toString()) || null;

export const markAccepted = (callId) => {
  const entry = activeByCallId.get(callId);
  if (entry) entry.status = "accepted";
  return entry;
};

export const removeCall = (callId) => {
  const entry = activeByCallId.get(callId);
  if (!entry) return;
  activeByCallId.delete(callId);
  callIdByUser.delete(entry.callerId);
  callIdByUser.delete(entry.calleeId);
};

export const size = () => activeByCallId.size;
