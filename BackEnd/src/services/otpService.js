import crypto from "crypto";

import * as otpRepo from "../repositories/otp.repository.js";
import { sendOtpEmail } from "../utils/sendOtp.js";
import generateOtp from "../utils/generateOtp.js";
import logger from "../utils/logger.js";
import { AppError } from "../errors/index.js";

const MAX_ATTEMPTS = 5;
const RATE_LIMIT_MS = 30000;
const HOURLY_LIMIT = 5;

const otpStore = new Map();

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

const canSendOtp = (email, purpose) => {
  const key = `${email}:${purpose}`;
  const now = Date.now();
  const record = otpStore.get(key);

  if (!record) return { allowed: true, remaining: HOURLY_LIMIT };

  if (now - record.lastSentAt < RATE_LIMIT_MS) {
    return { allowed: false, cooldown: true };
  }

  if (record.count >= HOURLY_LIMIT) {
    const oneHourAgo = now - 3600000;
    if (record.lastSentAt > oneHourAgo) {
      return { allowed: false, remaining: 0 };
    }
    otpStore.delete(key);
    return { allowed: true, remaining: HOURLY_LIMIT };
  }

  return { allowed: true, remaining: HOURLY_LIMIT - record.count };
};

const recordOtpSend = (email, purpose) => {
  const key = `${email}:${purpose}`;
  const now = Date.now();
  const record = otpStore.get(key);

  if (record) {
    record.count += 1;
    record.lastSentAt = now;
  } else {
    otpStore.set(key, { count: 1, lastSentAt: now });
  }
};

export const generateOtpService = async (email, purpose) => {
  const emailLower = email.toLowerCase().trim();

  const rateCheck = canSendOtp(emailLower, purpose);
  if (!rateCheck.allowed) {
    if (rateCheck.cooldown) {
      throw new AppError({ message: "Please wait 30 seconds before requesting another OTP", statusCode: 429, errorCode: "OTP_COOLDOWN" });
    }
    throw new AppError({ message: "Too many OTP requests. Please try again later.", statusCode: 429, errorCode: "OTP_LIMIT_REACHED" });
  }

  await otpRepo.deleteOtps({ emailId: emailLower, purpose, verified: false });

  const { otp, otpHash } = generateOtp();

  await otpRepo.createOtp({
    emailId: emailLower,
    otp: otpHash,
    purpose,
  });

  try {
    await sendOtpEmail(emailLower, otp, purpose);
  } catch (error) {
    logger.error("Failed to send OTP email", { email: emailLower, purpose });
  }

  recordOtpSend(emailLower, purpose);

  return { success: true, email: emailLower };
};

export const verifyOtpService = async (email, otp, purpose) => {
  const emailLower = email.toLowerCase().trim();
  const hashedOtp = hashOtp(otp);

  const otpDoc = await otpRepo.findOtp({
    emailId: emailLower,
    purpose,
    verified: false,
  });

  if (!otpDoc) {
    throw new AppError({ message: "OTP expired or not found. Please request a new OTP.", statusCode: 400, errorCode: "OTP_INVALID" });
  }

  if (otpDoc.attempts >= MAX_ATTEMPTS) {
    await otpRepo.deleteOtps({ _id: otpDoc._id });
    throw new AppError({ message: "Too many attempts. Please request a new OTP.", statusCode: 429, errorCode: "OTP_ATTEMPTS_EXCEEDED" });
  }

  if (otpDoc.otp !== hashedOtp) {
    otpDoc.attempts += 1;
    await otpDoc.save();
    throw new AppError({ message: `Invalid OTP. ${MAX_ATTEMPTS - otpDoc.attempts} attempts remaining.`, statusCode: 400, errorCode: "OTP_MISMATCH" });
  }

  otpDoc.verified = true;
  await otpDoc.save();

  return { success: true, verified: true, email: emailLower };
};

export const deleteOtpService = async (email, purpose) => {
  const emailLower = email.toLowerCase().trim();
  await otpRepo.deleteOtps({ emailId: emailLower, purpose });
};

export const isOtpVerified = async (email, purpose) => {
  const emailLower = email.toLowerCase().trim();
  const otpDoc = await otpRepo.findOtp({
    emailId: emailLower,
    purpose,
    verified: true,
  });
  return !!otpDoc;
};

export default {
  generateOtpService,
  verifyOtpService,
  deleteOtpService,
  isOtpVerified,
};
