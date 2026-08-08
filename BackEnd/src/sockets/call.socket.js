import { emitToUser, ensureConnection, activeUsers } from "../utils/socket.js";
import { getPlanLimits } from "../utils/planConfig.js";
import User from "../models/user.model.js";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import * as callService from "../services/call.service.js";
import * as callManager from "../services/callManager.js";
import config from "../config/env.js";
import logger from "../utils/logger.js";
import { randomUUID } from "crypto";

const inviteTimeouts = new Map();
const disconnectTimers = new Map();

// Grace period after a socket drop before an active call is torn down.
// Short network blips / tab switches reconnect the socket within a second or
// two — we only end the call if the user stays offline for this long.
const DISCONNECT_GRACE_MS = 5000;

const INVITE_RATE_WINDOW_MS = 30000;
const INVITE_RATE_MAX = 10;
const inviteTimestamps = new Map();

class CallSocketError extends Error {
  constructor(message, code = "CALL_ERROR") {
    super(message);
    this.code = code;
  }
}

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

const cancelDisconnectTimer = (callId) => {
  const t = disconnectTimers.get(callId);
  if (t) {
    clearTimeout(t);
    disconnectTimers.delete(callId);
  }
};

const createCallMessage = async ({ io, chatId, callerId, calleeId, callId, type, status, durationSec }) => {
  if (!chatId) return null;
  const clientMessageId = `call-${callId}-${status}`;
  const exists = await Message.findOne({ clientMessageId }).lean();
  if (exists) return exists;
  try {
    const msg = await Message.create({
      matchId: chatId,
      senderId: callerId,
      receiverId: calleeId,
      clientMessageId,
      message: "",
      isEncrypted: false,
      messageType: "call",
      metadata: {
        callDetails: { type, status, durationSec: durationSec || 0 },
      },
    });
    await Chat.findByIdAndUpdate(chatId, { $set: { lastMessageAt: msg.createdAt || new Date() } });
    const populated = await Message.findById(msg._id).populate("senderId", "firstName lastName photoUrl").lean();
    if (io) io.to(chatId.toString()).emit("message:created", populated);
    return populated;
  } catch (err) {
    // E11000 duplicate key: the timeout and a hangup raced and both tried to
    // write the same `call-<id>-<status>` entry. Not an error — return the
    // winner so exactly one missed/ended entry exists per call.
    if (err?.code === 11000) {
      const existing = await Message.findOne({ clientMessageId }).lean();
      return existing;
    }
    logger.warn("call message creation failed", err);
    return null;
  }
};

const scheduleMissed = (io, callId) => {
  const t = setTimeout(async () => {
    inviteTimeouts.delete(callId);
    try {
      if (!callManager.getCall(callId)) return; // call already ended/hung up
      const session = await callService.endCall(callId, "timeout");
      if (session) {
        await createCallMessage({
          io,
          chatId: session.chatId,
          callerId: session.callerId,
          calleeId: session.calleeId,
          callId,
          type: session.type,
          status: "missed",
        });
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
        if (!["voice", "video"].includes(type)) throw new CallSocketError("Invalid call type", "VALIDATION_ERROR");
        if (!calleeId) throw new CallSocketError("calleeId is required", "VALIDATION_ERROR");

        await ensureConnection(userId, calleeId);

        if (isInviteRateLimited(userId)) {
          socket.emit("call:error", {
            message: "Too many call attempts. Please wait a moment.",
            code: "RATE_LIMITED",
          });
          return;
        }

        const caller = await User.findById(userId).select("firstName lastName photoUrl membershipType").lean();
        const planLimits = await getPlanLimits(caller?.membershipType || "free");
        const allowed = type === "video" ? planLimits.canVideoCall : planLimits.canCall;
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

        // Socket present in the registry but dead (ghost) — the invite is
        // lost. Fail fast instead of letting the callee ring forever.
        if (!delivered) {
          await callService.endCall(session.callId, "timeout");
          socket.emit("call:unavailable", { message: "User is not reachable right now." });
          return;
        }

        socket.emit("call:created", {
          callId: session.callId,
          type: session.type,
          calleeId,
        });

        scheduleMissed(io, session.callId);
      } catch (err) {
        logger.warn("[call] invite failed from=%s to=%s err=%s", userId, calleeId, err.message);
        socket.emit("call:error", { message: err.message, code: err.code });
      }
    });

    socket.on("call:accept", async ({ callId } = {}) => {
      const userId = socket.data.userId;
      if (!userId) return;
      try {
        const call = callManager.getCall(callId);
        if (!call || call.calleeId !== userId.toString()) {
          socket.emit("call:error", { message: "Invalid call", code: "INVALID_CALL" });
          return;
        }
        await callService.acceptCall(callId);
        clearInviteTimeout(callId);
        emitToUser(call.callerId, "call:accept", { callId });
      } catch (err) {
        socket.emit("call:error", { message: err.message, code: err.code });
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
        cancelDisconnectTimer(callId);
        await createCallMessage({
          io,
          chatId: call.chatId,
          callerId: call.callerId,
          calleeId: call.calleeId,
          callId,
          type: call.type,
          status: "declined",
        });
        emitToUser(call.callerId, "call:decline", { callId });
      } catch (err) {
        socket.emit("call:error", { message: err.message, code: err.code });
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
        const session = await callService.endCall(callId, reason);
        clearInviteTimeout(callId);
        cancelDisconnectTimer(callId);
        emitToUser(otherParty(call, userId), "call:end", { callId, reason });
        if (!session) return;
        // Instagram-style: exactly one chat entry per call.
        // - answered calls → "Call ended · m:ss"
        // - calls that ended while still ringing (caller hung up / timeout)
        //   → "Missed call"
        // - declined calls are handled by `call:decline`.
        if (session.connectedAt) {
          await createCallMessage({
            io,
            chatId: call.chatId || session.chatId,
            callerId: call.callerId,
            calleeId: call.calleeId,
            callId,
            type: call.type,
            status: "ended",
            durationSec: session.durationSec || 0,
          });
        } else if (session.status !== "declined") {
          await createCallMessage({
            io,
            chatId: call.chatId || session.chatId,
            callerId: call.callerId,
            calleeId: call.calleeId,
            callId,
            type: call.type,
            status: "missed",
            durationSec: 0,
          });
        }
      } catch (err) {
        socket.emit("call:error", { message: err.message, code: err.code });
      }
    });

    socket.on("disconnect", () => {
      const userId = socket.data.userId;
      if (!userId) return;
      const callId = callManager.getActiveCallIdForUser(userId);
      if (!callId) return;
      const call = callManager.getCall(callId);
      if (!call) return;

      // The user may still have other live sockets (second tab) or may
      // reconnect within the grace window (network blip) — only tear the
      // call down if they stay completely gone.
      const userSockets = activeUsers.get(userId);
      if (userSockets && userSockets.size > 0) return;
      if (disconnectTimers.has(callId)) return;

      const other = call.callerId === userId ? call.calleeId : call.callerId;
      const t = setTimeout(async () => {
        disconnectTimers.delete(callId);
        try {
          const liveSockets = activeUsers.get(userId);
          if (liveSockets && liveSockets.size > 0) return; // reconnected in time
          if (!callManager.getCall(callId)) return; // call ended meanwhile
          callManager.removeCall(callId);
          clearInviteTimeout(callId);
          const session = await callService.endCall(callId, "disconnected");
          emitToUser(other, "call:end", { callId, reason: "disconnected" });
          if (session?.connectedAt) {
            await createCallMessage({
              io,
              chatId: call.chatId || session.chatId,
              callerId: call.callerId,
              calleeId: call.calleeId,
              callId,
              type: call.type,
              status: "ended",
              durationSec: session.durationSec || 0,
            });
          }
        } catch (err) {
          logger.warn("call:disconnect handling failed", err);
        }
      }, DISCONNECT_GRACE_MS);
      disconnectTimers.set(callId, t);
    });
  });
};

export default initializeCallSocket;
