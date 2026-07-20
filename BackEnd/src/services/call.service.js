import { randomUUID } from "crypto";
import * as callRepo from "../repositories/call.repository.js";
import * as callManager from "./callManager.js";

export const startCall = async ({ callerId, calleeId, type, chatId }) => {
  const callId = randomUUID();
  const { error } = callManager.createCall({ callId, callerId, calleeId, type, chatId });
  if (error === "busy") {
    const err = new Error("User is busy on another call");
    err.statusCode = 409;
    err.errorCode = "CALL_BUSY";
    throw err;
  }
  const session = await callRepo.createCallSession({
    callId,
    callerId,
    calleeId,
    type,
    chatId,
    status: "ringing",
  });
  return session;
};

export const acceptCall = async (callId) => {
  callManager.markAccepted(callId);
  return callRepo.updateCallSession(callId, { status: "accepted", connectedAt: new Date() });
};

export const endCall = async (callId, reason = "hangup") => {
  callManager.removeCall(callId);
  const session = await callRepo.findCallSession(callId);
  if (!session) return null;
  if (session.status === "ringing" && reason === "timeout") {
    session.status = "missed";
    session.endReason = "timeout";
    session.endedAt = new Date();
    await session.save();
    return session;
  }
  if (session.status === "ringing" && reason === "decline") {
    session.status = "declined";
    session.endReason = "decline";
    session.endedAt = new Date();
    await session.save();
    return session;
  }
  if (session.status === "ringing" && reason === "busy") {
    session.status = "cancelled";
    session.endReason = "busy";
    session.endedAt = new Date();
    await session.save();
    return session;
  }
  session.endedAt = new Date();
  session.status = "completed";
  session.endReason = reason;
  if (session.connectedAt) {
    session.durationSec = Math.max(0, Math.round((session.endedAt - session.connectedAt) / 1000));
  }
  await session.save();
  return session;
};

export const getHistory = (userId, opts) => callRepo.listCallHistory(userId, opts);

export const getMissed = (userId) => callRepo.listMissedCalls(userId);

export const getActiveCall = (userId) => callRepo.findActiveCallForUser(userId);

export const ackCall = async (callId, userId) => {
  const session = await callRepo.findCallSession(callId);
  if (!session) return null;
  if (session.calleeId.toString() !== userId.toString()) return null;
  if (session.status === "missed") {
    session.ack = true;
    await session.save();
  }
  return session;
};
