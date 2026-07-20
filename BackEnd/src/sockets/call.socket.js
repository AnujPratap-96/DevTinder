import { emitToUser, ensureConnection, activeUsers } from "../utils/socket.js";
import { getPlanBySlug } from "../utils/planConfig.js";
import User from "../models/user.model.js";
import * as callService from "../services/call.service.js";
import * as callManager from "../services/callManager.js";
import config from "../config/env.js";
import logger from "../utils/logger.js";

const inviteTimeouts = new Map(); // callId -> setTimeout handle

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
    const userId = socket.data.userId;
    if (!userId) return;

    socket.on("call:invite", async ({ calleeId, type = "voice", chatId } = {}) => {
      try {
        if (!["voice", "video"].includes(type)) throw new Error("Invalid call type");
        if (!calleeId) throw new Error("calleeId is required");

        await ensureConnection(userId, calleeId);

        const caller = await User.findById(userId).select("firstName lastName photoUrl membershipType").lean();
        const plan = await getPlanBySlug(caller?.membershipType || "free");
        const allowed = type === "video" ? plan?.limits?.canVideoCall : plan?.limits?.canCall;
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

        emitToUser(calleeId, "call:invite", {
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

        socket.emit("call:created", {
          callId: session.callId,
          type: session.type,
          calleeId,
        });

        scheduleMissed(session.callId);
      } catch (err) {
        socket.emit("call:error", { message: err.message, code: err.errorCode });
      }
    });

    socket.on("call:accept", async ({ callId } = {}) => {
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
      const call = callManager.getCall(callId);
      if (!call || (call.callerId !== userId.toString() && call.calleeId !== userId.toString())) return;
      emitToUser(otherParty(call, userId), "call:offer", { callId, sdp });
    });

    socket.on("call:answer", ({ callId, sdp } = {}) => {
      const call = callManager.getCall(callId);
      if (!call || (call.callerId !== userId.toString() && call.calleeId !== userId.toString())) return;
      emitToUser(otherParty(call, userId), "call:answer", { callId, sdp });
    });

    socket.on("call:ice-candidate", ({ callId, candidate } = {}) => {
      const call = callManager.getCall(callId);
      if (!call || (call.callerId !== userId.toString() && call.calleeId !== userId.toString())) return;
      emitToUser(otherParty(call, userId), "call:ice-candidate", { callId, candidate });
    });

    socket.on("call:end", async ({ callId, reason = "hangup" } = {}) => {
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
  });
};

export default initializeCallSocket;
