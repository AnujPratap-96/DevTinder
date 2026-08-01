/**
 * enhancement.service.js — Phase-1 chat enhancement services.
 * Self-contained module: does not alter any pre-existing chat logic.
 */
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import config from "../config/env.js";
import { getIO } from "../utils/socket.js";
import { AppError, NotFoundError, ValidationError } from "../errors/index.js";
import * as chatRepo from "../repositories/chat.repository.js";
import ENHANCEMENTS from "./enhancement.config.js";
import logger from "../utils/logger.js";

cloudinary.config({
  cloud_name: config.storage.cloudName,
  api_key: config.storage.apiKey,
  api_secret: config.storage.apiSecret,
});

const isParticipant = (chat, userId) =>
  chat.participants.some((p) => p.toString() === userId.toString());

const uploadToCloudinary = (file, { resourceType, folder }) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: resourceType }, (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      })
      .end(file.buffer);
  });

const assertChatAccess = async (matchId, userId) => {
  const chat = await Chat.findById(matchId);
  if (!chat) throw new NotFoundError("Conversation");
  if (!isParticipant(chat, userId)) {
    throw new AppError({ message: "You are not part of this conversation", statusCode: 403 });
  }
  return chat;
};

/**
 * Upload a voice note and persist it as an "audio" chat message.
 * Mirrors the existing image-upload flow (message:created via socket room).
 * The client-supplied clientMessageId lets the sender's optimistic message
 * be replaced cleanly by the existing upsert logic.
 */
export const uploadVoiceNote = async ({ userId, targetUserId, matchId, file, clientMessageId, durationSec }) => {
  if (!ENHANCEMENTS.voiceNotes.enabled) throw new AppError({ message: "Voice notes are disabled", statusCode: 400 });
  if (!file) throw new ValidationError("Audio file is required");
  if (!userId || !targetUserId) throw new ValidationError("userId and targetUserId are required");

  const isConnected = await chatRepo.ensureConnection(userId, targetUserId);
  if (!isConnected) {
    throw new AppError({ message: "You are not connected with this user", statusCode: 403 });
  }

  const chat = matchId
    ? await chatRepo.findChatById(matchId)
    : await chatRepo.findOrCreateChat(userId, targetUserId);
  if (!chat) throw new NotFoundError("Conversation");

  const uploadResult = await uploadToCloudinary(file, {
    resourceType: "auto",
    folder: ENHANCEMENTS.voiceNotes.folder,
  });
  if (!uploadResult?.secure_url) {
    throw new AppError({ message: "Voice note upload failed", statusCode: 500 });
  }

  const msg = await chatRepo.createMessage({
    matchId: chat._id,
    senderId: userId,
    receiverId: targetUserId,
    clientMessageId: clientMessageId || `voice-${randomUUID()}`,
    message: uploadResult.secure_url,
    isEncrypted: false,
    messageType: "audio",
    delivered: true,
    deliveredAt: new Date(),
    metadata: { durationSec: Number(durationSec) || 0, duration: uploadResult.duration || 0 },
  });

  await chatRepo.updateChatLastMessage(chat._id, msg.createdAt);
  const populated = await chatRepo.populateMessageSender(msg._id);

  const io = getIO();
  if (io) {
    io.to(chat._id.toString()).emit("message:created", populated);
  }
  return populated;
};

/**
 * Search messages within a chat (text match or pinned-only).
 */
export const searchMessages = async ({ userId, matchId, query, pinnedOnly = false, limit = ENHANCEMENTS.chatSearch.maxResults }) => {
  if (!ENHANCEMENTS.chatSearch.enabled) throw new AppError({ message: "Chat search is disabled", statusCode: 400 });
  await assertChatAccess(matchId, userId);

  const filter = { matchId };
  if (pinnedOnly) {
    filter.pinnedAt = { $ne: null };
  } else if (query?.trim()) {
    const safe = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.message = { $regex: safe, $options: "i" };
  } else {
    return [];
  }

  return Message.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
};

/**
 * Toggle the pinned state of a message (only the sender of the message can pin it).
 */
export const togglePinMessage = async ({ userId, messageId }) => {
  if (!ENHANCEMENTS.chatPrefs.enabled) throw new AppError({ message: "Pinning is disabled", statusCode: 400 });
  const message = await Message.findById(messageId);
  if (!message) throw new NotFoundError("Message");
  if (message.senderId.toString() !== userId.toString()) {
    throw new AppError({ message: "You can only pin your own messages", statusCode: 403 });
  }

  const pinnedAt = message.pinnedAt ? null : new Date();
  await Message.updateOne({ _id: messageId }, { $set: { pinnedAt } });

  const io = getIO();
  if (io) {
    io.to(message.matchId.toString()).emit("message:pinned", { messageId, matchId: message.matchId, pinnedAt });
  }
  return { messageId, pinnedAt };
};

/**
 * Return pin/mute prefs for every chat of the current user.
 * Shape: { [matchId]: { pinned, muted } }
 */
export const getChatPrefs = async (userId) => {
  if (!ENHANCEMENTS.chatPrefs.enabled) throw new AppError({ message: "Chat prefs are disabled", statusCode: 400 });
  const chats = await Chat.find({ participants: userId }).select("prefs").lean();
  const result = {};
  for (const chat of chats) {
    const prefs = chat.prefs?.get?.(userId.toString());
    if (prefs) {
      result[chat._id.toString()] = { pinned: Boolean(prefs.pinned), muted: Boolean(prefs.muted) };
    }
  }
  return result;
};

/**
 * Set pin/mute preferences for the current user on a chat.
 */
export const setChatPref = async ({ userId, matchId, pinned, muted }) => {
  if (!ENHANCEMENTS.chatPrefs.enabled) throw new AppError({ message: "Chat prefs are disabled", statusCode: 400 });
  const chat = await assertChatAccess(matchId, userId);

  const prefs = chat.prefs?.get?.(userId.toString()) || {};
  const next = {
    pinned: typeof pinned === "boolean" ? pinned : Boolean(prefs.pinned),
    muted: typeof muted === "boolean" ? muted : Boolean(prefs.muted),
  };
  await Chat.updateOne(
    { _id: matchId },
    { $set: { [`prefs.${userId.toString()}`]: next } }
  );
  return { matchId, ...next };
};

/**
 * Add (or remove, if already present) a reaction from the current user
 * on a message, then broadcast the updated reaction list to the chat room.
 */
export const addReaction = async ({ userId, matchId, messageId, emoji }) => {
  if (!ENHANCEMENTS.reactions.enabled) throw new AppError({ message: "Reactions are disabled", statusCode: 400 });
  await assertChatAccess(matchId, userId);

  const message = await Message.findById(messageId);
  if (!message) throw new NotFoundError("Message");

  const reactions = message.reactions || [];
  const existingIndex = reactions.findIndex(
    (r) => r.userId.toString() === userId.toString() && r.emoji === emoji
  );

  let nextReactions;
  if (existingIndex >= 0) {
    nextReactions = reactions.filter((_, i) => i !== existingIndex);
  } else {
    if (reactions.length >= ENHANCEMENTS.reactions.maxPerMessage) {
      throw new AppError({ message: "Maximum reactions reached for this message", statusCode: 400 });
    }
    nextReactions = [...reactions, { userId, emoji, createdAt: new Date() }];
  }

  await Message.updateOne({ _id: messageId }, { $set: { reactions: nextReactions } });

  const io = getIO();
  if (io) {
    io.to(matchId.toString()).emit("message:reacted", { matchId, messageId, reactions: nextReactions });
  }
  return nextReactions;
};

export default {
  uploadVoiceNote,
  searchMessages,
  togglePinMessage,
  getChatPrefs,
  setChatPref,
  addReaction,
};
