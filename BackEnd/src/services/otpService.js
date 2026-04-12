const crypto = require("crypto");
const Otp = require("../models/otp.model");
const { sendOtpEmail } = require("../utils/sendOtp");
const generateOtp = require("../utils/generateOtp");

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

const OTP_EXPIRY_SECONDS = 300;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_MS = 30000;
const HOURLY_LIMIT = 5;

const otpStore = new Map();

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

const generateOtpService = async (email, purpose) => {
  const emailLower = email.toLowerCase().trim();
  
  const rateCheck = canSendOtp(emailLower, purpose);
  if (!rateCheck.allowed) {
    if (rateCheck.cooldown) {
      throw new Error("Please wait 30 seconds before requesting another OTP");
    }
    throw new Error("Too many OTP requests. Please try again later.");
  }

  await Otp.deleteMany({ emailId: emailLower, purpose, verified: false });

  const otp = generateOtp();
  const hashedOtp = hashOtp(otp);

  await Otp.create({
    emailId: emailLower,
    otp: hashedOtp,
    purpose,
  });

  const purposeMessages = {
    signup: "Welcome to DevTinder! Your verification OTP is:",
    login: "Your DevTinder login OTP is:",
    "reset-password": "Your DevTinder password reset OTP is:",
  };

  const message = `${purposeMessages[purpose] || "Your OTP is:"} ${otp}. Valid for 5 minutes.`;
  
  try {
    await sendOtpEmail(emailLower, otp);
  } catch (error) {
    console.error("Failed to send OTP email:", error);
  }

  recordOtpSend(emailLower, purpose);

  return { success: true, email: emailLower };
};

const verifyOtpService = async (email, otp, purpose) => {
  const emailLower = email.toLowerCase().trim();
  const hashedOtp = hashOtp(otp);

  const otpDoc = await Otp.findOne({
    emailId: emailLower,
    purpose,
    verified: false,
  });

  if (!otpDoc) {
    throw new Error("OTP expired or not found. Please request a new OTP.");
  }

  if (otpDoc.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otpDoc._id });
    throw new Error("Too many attempts. Please request a new OTP.");
  }

  if (otpDoc.otp !== hashedOtp) {
    otpDoc.attempts += 1;
    await otpDoc.save();
    throw new Error(`Invalid OTP. ${MAX_ATTEMPTS - otpDoc.attempts} attempts remaining.`);
  }

  otpDoc.verified = true;
  await otpDoc.save();

  return { success: true, verified: true, email: emailLower };
};

const deleteOtpService = async (email, purpose) => {
  const emailLower = email.toLowerCase().trim();
  await Otp.deleteMany({ emailId: emailLower, purpose });
};

const isOtpVerified = async (email, purpose) => {
  const emailLower = email.toLowerCase().trim();
  const otpDoc = await Otp.findOne({
    emailId: emailLower,
    purpose,
    verified: true,
  });
  return !!otpDoc;
};

module.exports = {
  generateOtpService,
  verifyOtpService,
  deleteOtpService,
  isOtpVerified,
};