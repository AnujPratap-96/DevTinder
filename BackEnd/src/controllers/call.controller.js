import { successResponse } from "../utils/response.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as callService from "../services/call.service.js";
import config from "../config/env.js";
import crypto from "crypto";

const buildIceServers = () => {
  const servers = (config.webrtc.stunUrls || []).map((url) => ({ urls: url }));
  const { turnUrls, turnSecret, turnTtlSec } = config.webrtc;
  if (turnUrls && turnUrls.length) {
    if (turnSecret) {
      const expiry = Math.floor(Date.now() / 1000) + turnTtlSec;
      const username = `${expiry}:devtinder`;
      const credential = crypto.createHmac("sha1", turnSecret).update(username).digest("base64");
      turnUrls.forEach((url) => servers.push({ urls: url, username, credential }));
    } else {
      turnUrls.forEach((url) => servers.push({ urls: url }));
    }
  }
  return servers;
};

export const getCallHistory = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const cursor = req.query.cursor || null;
  const calls = await callService.getHistory(req.user._id, { limit, cursor });
  let nextCursor = null;
  if (calls.length > limit) {
    const last = calls[limit - 1];
    nextCursor = last._id.toString();
    calls.length = limit;
  }
  return successResponse(res, { data: { calls, nextCursor } });
});

export const getMissedCalls = asyncHandler(async (req, res) => {
  const calls = await callService.getMissed(req.user._id);
  return successResponse(res, { data: { calls } });
});

export const getActiveCall = asyncHandler(async (req, res) => {
  const call = await callService.getActiveCall(req.user._id);
  return successResponse(res, { data: { call } });
});

export const ackMissedCall = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await callService.ackCall(id, req.user._id);
  return successResponse(res, { message: "Acknowledged" });
});

export const getTurnCredentials = asyncHandler(async (req, res) => {
  return successResponse(res, { data: { iceServers: buildIceServers() } });
});
