import jwt from "jsonwebtoken";

import TwoFactor from "../models/twoFactor.js";
import User from "../models/user.model.js";
import config from "../config/env.js";
import SECURITY from "./security.config.js";
import { generateSecret, generateOtpUri, verifyTotp } from "./totp.js";
import { AppError, ValidationError } from "../errors/index.js";

const getRecord = (userId) => TwoFactor.findOne({ userId });

const syncUserFlag = async (userId, enabled) => {
  await User.findByIdAndUpdate(userId, { $set: { twoFactorEnabled: enabled } }).catch(() => {});
};

export const getStatus = async (userId) => {
  const record = await getRecord(userId);
  return { twoFactorEnabled: !!record?.enabled };
};

// Generates (or reuses) the TOTP secret and returns the otpauth URI.
// The secret is stored immediately, but enforcement only starts on `enable`.
export const startSetup = async ({ userId, emailId }) => {
  let record = await getRecord(userId);
  if (record?.enabled) {
    throw new ValidationError("Two-factor authentication is already enabled");
  }
  if (!record) {
    record = await TwoFactor.create({ userId });
  }
  if (!record.secret) {
    record.secret = generateSecret();
    await record.save();
  }
  const otpauthUri = generateOtpUri({
    secret: record.secret,
    accountName: emailId,
    issuer: SECURITY.twoFactor.issuer,
  });
  return { secret: record.secret, otpauthUri };
};

export const enable = async ({ userId, token }) => {
  const record = await getRecord(userId);
  if (!record?.secret) {
    throw new ValidationError("Start the 2FA setup first");
  }
  if (record.enabled) {
    throw new ValidationError("Two-factor authentication is already enabled");
  }
  if (!verifyTotp(record.secret, token)) {
    throw new ValidationError("Invalid verification code");
  }
  record.enabled = true;
  record.enabledAt = new Date();
  await record.save();
  await syncUserFlag(userId, true);
  return { twoFactorEnabled: true };
};

export const disable = async ({ userId, token }) => {
  const record = await getRecord(userId);
  if (!record?.enabled) {
    throw new ValidationError("Two-factor authentication is not enabled");
  }
  if (!verifyTotp(record.secret, token)) {
    throw new ValidationError("Invalid verification code");
  }
  record.enabled = false;
  record.enabledAt = null;
  await record.save();
  await syncUserFlag(userId, false);
  return { twoFactorEnabled: false };
};

export const isEnabledForUser = async (userId) => {
  if (!SECURITY.enabled || !SECURITY.twoFactor.enabled) return false;
  const record = await getRecord(userId);
  return !!record?.enabled;
};

export const verifyLoginCode = async ({ userId, token }) => {
  const record = await getRecord(userId);
  if (!record?.enabled || !record.secret) {
    throw new ValidationError("Two-factor authentication is not enabled");
  }
  if (!verifyTotp(record.secret, token)) {
    throw new ValidationError("Invalid two-factor code");
  }
  return true;
};

export const createTempLoginToken = (userId) =>
  jwt.sign({ _id: userId, purpose: "2fa-login" }, config.jwt.secret, {
    expiresIn: SECURITY.twoFactor.tempTokenTtl,
  });

export const decodeTempLoginToken = (tempToken) => {
  const payload = jwt.verify(tempToken, config.jwt.secret);
  if (payload.purpose !== "2fa-login") {
    throw new AppError({ message: "Invalid two-factor token", statusCode: 401, errorCode: "AUTH_FAILED" });
  }
  return payload;
};

export default {
  getStatus,
  startSetup,
  enable,
  disable,
  isEnabledForUser,
  verifyLoginCode,
  createTempLoginToken,
  decodeTempLoginToken,
};
