import { emitToUser, ensureConnection, activeUsers } from "../utils/socket.js";
import { getPlanBySlug } from "../utils/planConfig.js";
import User from "../models/user.model.js";
import * as callService from "../services/call.service.js";
import * as callManager from "../services/callManager.js";
import config from "../config/env.js";
import logger from "../utils/logger.js";

const inviteTimeouts = new Map(); // callId -> setTimeout handle

// Anti-spam limit on placing calls.
const INVITE_RATE_WINDOW_MS = 30000;
const INVITE_RATE_MAX = 10;
const inviteTimestamps = new Map(); // userId -> number[]

const isInviteRateLimited = (userId) => {
  const now = Date.now();
  const arr = inviteTimestamps.get(userId) ?? [];
  const recent = arr.filter((t) => now - t < INVITE_RATE_WINDOW_MS);
  recent.push(now);
  inviteTimestamps.set(userId, recent);
  return recent.length > INVITE_RATE_MAX;
};

const clearInviteTimeout = (callId) => {
  const t = inviteTimeouts.get(callId);
  if (t) {
    clearTimeout(t);
    inviteTimeouts.delete(callId);
  }
};

const scheduleMissed = (callId) => {
  const t = setTimeout(async () => {
    inviteTimeouts.delete(callId);
    try {
      const session = await callService.endCall(callId, "timeout");
      if (session) {
        emitToUser(session.calleeId, "call:missed", {
          callId,
          type: session.type,
          caller: { _id: session.callerId },
        });
        emitToUser(session.callerId, "call:end", { callId, reason: "timeout" });
      }
    } catch (err) {
      logger.warn("call:timeout handling failed", err);
    }
  }, config.webrtc.callTimeoutMs);
  inviteTimeouts.set(callId, t);
};

const otherParty = (call, userId) =>
  call.callerId === userId.toString() ? call.calleeId : call.callerId;

export const initializeCallSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("call:invite", async ({ calleeId, type = "voice", chatId } = {}) => {
      const userId = socket.data.userId;
      if (!userId) {
        socket.emit("call:error", { message: "Not authenticated", code: "UNAUTHENTICATED" });
        return;
      }
      try {
        if (!["voice", "video"].includes(type)) throw new Error("Invalid call type");
        if (!calleeId) throw new Error("calleeId is required");

        logger.info("[call] invite from=%s to=%s type=%s calleeOnline=%s", userId, calleeId, type, activeUsers.has(calleeId.toString()));

        await ensureConnection(userId, calleeId);
        logger.info("[call] connection OK from=%s to=%s", userId, calleeId);

        if (isInviteRateLimited(userId)) {
          socket.emit("call:error", {
            message: "Too many call attempts. Please wait a moment.",
            code: "RATE_LIMITED",
          });
          return;
        }

        const caller = await User.findById(userId).select("firstName lastName photoUrl membershipType").lean();
        const plan = await getPlanBySlug(caller?.membershipType || "free");
        const allowed = type === "video" ? plan?.limits?.canVideoCall : plan?.limits?.canCall;
        logger.info("[call] plan=%s allowed=%s", caller?.membershipType, allowed);
        if (!allowed) {
          socket.emit("call:error", {
            message: `Your plan does not include ${type} calls. Upgrade to enable calling.`,
            code: "PLAN_REQUIRED",
          });
          return;
        }

        if (!activeUsers.has(calleeId.toString())) {
          socket.emit("call:unavailable", { message: "User is not reachable right now." });
          return;
        }
        if (callManager.isUserInCall(calleeId) || callManager.isUserInCall(userId)) {
          socket.emit("call:busy", { message: "User is busy on another call." });
          return;
        }

        const session = await callService.startCall({
          callerId: userId,
          calleeId,
          type,
          chatId,
        });

        const calleeSockets = activeUsers.get(calleeId.toString());
        logger.info("[call] callee socket ids=%o", Array.from(calleeSockets ?? []));
        const delivered = emitToUser(calleeId, "call:invite", {
          callId: session.callId,
          type: session.type,
          caller: {
            _id: caller._id,
            firstName: caller.firstName,
            lastName: caller.lastName,
            photoUrl: caller.photoUrl,
          },
          chatId: session.chatId,
        });
        logger.info("[call] invite emitted to callee=%s callId=%s delivered=%s", calleeId, session.callId, delivered);

        socket.emit("call:created", {
          callId: session.callId,
          type: session.type,
          calleeId,
        });

        scheduleMissed(session.callId);
      } catch (err) {
        logger.warn("[call] invite failed from=%s to=%s err=%s", userId, calleeId, err.message);
        socket.emit("call:error", { message: err.message, code: err.errorCode });
      }
    });

    socket.on("call:accept", async ({ callId } = {}) => {
      const userId = socket.data.userId;
      if (!userId) return;
      try {
        const call = callManager.getCall(callId);
        if (!call || call.calleeId !== userId.toString()) {
          socket.emit("call:error", { message: "Invalid call" });
          return;
        }
        await callService.acceptCall(callId);
        clearInviteTimeout(callId);
        emitToUser(call.callerId, "call:accept", { callId });
      } catch (err) {
        socket.emit("call:error", { message: err.message });
      }
    });

    socket.on("call:decline", async ({ callId } = {}) => {
      const userId = socket.data.userId;
      if (!userId) return;
      try {
        const call = callManager.getCall(callId);
        if (!call || call.calleeId !== userId.toString()) return;
        await callService.endCall(callId, "decline");
        clearInviteTimeout(callId);
        emitToUser(call.callerId, "call:decline", { callId });
      } catch (err) {
        socket.emit("call:error", { message: err.message });
      }
    });

    socket.on("call:offer", ({ callId, sdp } = {}) => {
      const userId = socket.data.userId;
      if (!userId) return;
      const call = callManager.getCall(callId);
      if (!call || (call.callerId !== userId.toString() && call.calleeId !== userId.toString())) return;
      emitToUser(otherParty(call, userId), "call:offer", { callId, sdp });
    });

    socket.on("call:answer", ({ callId, sdp } = {}) => {
      const userId = socket.data.userId;
      if (!userId) return;
      const call = callManager.getCall(callId);
      if (!call || (call.callerId !== userId.toString() && call.calleeId !== userId.toString())) return;
      emitToUser(otherParty(call, userId), "call:answer", { callId, sdp });
    });

    socket.on("call:ice-candidate", ({ callId, candidate } = {}) => {
      const userId = socket.data.userId;
      if (!userId) return;
      const call = callManager.getCall(callId);
      if (!call || (call.callerId !== userId.toString() && call.calleeId !== userId.toString())) return;
      emitToUser(otherParty(call, userId), "call:ice-candidate", { callId, candidate });
    });

    socket.on("call:end", async ({ callId, reason = "hangup" } = {}) => {
      const userId = socket.data.userId;
      if (!userId) return;
      try {
        const call = callManager.getCall(callId);
        if (!call || (call.callerId !== userId.toString() && call.calleeId !== userId.toString())) return;
        await callService.endCall(callId, reason);
        clearInviteTimeout(callId);
        emitToUser(otherParty(call, userId), "call:end", { callId, reason });
      } catch (err) {
        socket.emit("call:error", { message: err.message });
      }
    });

    // If a user disconnects mid-call, free them in the call registry and
    // notify the other party so neither side stays stuck "in a call".
    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      if (!userId) return;
      const callId = callManager.getActiveCallIdForUser(userId);
      if (!callId) return;
      const call = callManager.getCall(callId);
      callManager.removeCall(callId);
      if (call) {
        const other = call.callerId === userId.toString() ? call.calleeId : call.callerId;
        emitToUser(other, "call:end", { callId, reason: "disconnected" });
      }
    });
  });
};

export default initializeCallSocket;
