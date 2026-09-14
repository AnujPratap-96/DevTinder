import bcrypt from "bcrypt";
import crypto from "crypto";
import validator from "validator";
import { OAuth2Client } from "google-auth-library";

import config from "../config/env.js";
import {
  generateOtpService,
  verifyOtpService,
  deleteOtpService,
  isOtpVerified,
} from "./otpService.js";
import { findUserByEmail, updateUserById, saveUser } from "../repositories/user.repository.js";
import { AppError, ValidationError } from "../errors/index.js";
import { generateSignJWT } from "../middlewares/signupauth.js";
import { run as sendEmail } from "../utils/sendEmail.js";
import logger from "../utils/logger.js";
import User from "../models/user.model.js";
import * as twoFactorService from "../security/twoFactor.service.js"; // [PHASE-3]
import * as sessionService from "../security/session.service.js"; // [PHASE-3]

const ALLOWED_PURPOSES = ["signup", "login", "reset-password"];

const googleClientId = config.oauth.googleClientId;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const normaliseEmail = (email) => email?.toLowerCase().trim();

export const sendOtp = async ({ email, purpose }) => {
  const normalisedEmail = normaliseEmail(email);
  if (!normalisedEmail) {
    throw new ValidationError("Email is required");
  }

  if (!ALLOWED_PURPOSES.includes(purpose)) {
    throw new ValidationError("Invalid OTP purpose");
  }

  if (purpose === "signup") {
    const existing = await findUserByEmail(normalisedEmail);
    if (existing) {
      throw new ValidationError("User already registered");
    }
  }

  if (["login", "reset-password"].includes(purpose)) {
    const existing = await findUserByEmail(normalisedEmail);
    if (!existing) {
      throw new ValidationError("No account found with this email");
    }
  }

  await generateOtpService(normalisedEmail, purpose);
  return { email: normalisedEmail };
};

export const verifyOtp = async ({ email, otp, purpose }) => {
  const normalisedEmail = normaliseEmail(email);
  if (!normalisedEmail || !otp || !purpose) {
    throw new ValidationError("Email, OTP and purpose are required");
  }

  return verifyOtpService(normalisedEmail, otp, purpose);
};

export const resetPassword = async ({ email, newPassword }) => {
  const normalisedEmail = normaliseEmail(email);
  if (!normalisedEmail || !newPassword) {
    throw new ValidationError("Email and new password are required");
  }

  if (!validator.isStrongPassword(newPassword)) {
    throw new ValidationError("Password is not strong enough");
  }

  const verified = await isOtpVerified(normalisedEmail, "reset-password");
  if (!verified) {
    throw new ValidationError("Please verify OTP first");
  }

  const user = await findUserByEmail(normalisedEmail);
  if (!user) {
    throw new AppError({ message: "User not found", statusCode: 404 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  user.password = hash;
  await saveUser(user);
  await deleteOtpService(normalisedEmail, "reset-password");

  return { email: normalisedEmail };
};

export const initiateSignup = async ({ emailId }) => {
  const normalisedEmail = normaliseEmail(emailId);
  if (!normalisedEmail) {
    throw new ValidationError("Email ID is required");
  }

  if (!validator.isEmail(normalisedEmail)) {
    throw new ValidationError("Invalid email ID");
  }

  const existing = await findUserByEmail(normalisedEmail);
  if (existing) {
    throw new ValidationError("User already registered");
  }

  await generateOtpService(normalisedEmail, "signup");
  const token = await generateSignJWT(normalisedEmail);
  return { token, email: normalisedEmail };
};

export const completeSignup = async ({
  emailId,
  firstName,
  lastName,
  password,
  age,
  gender,
}) => {
  const normalisedEmail = normaliseEmail(emailId);
  if (!normalisedEmail) {
    throw new ValidationError("Email ID is required");
  }

  const verified = await isOtpVerified(normalisedEmail, "signup");
  if (!verified) {
    throw new ValidationError("Please verify OTP first");
  }

  if (!firstName || !lastName || !password || !age || !gender) {
    throw new ValidationError("Missing required signup fields");
  }

  if (firstName.length < 4 || firstName.length > 50) {
    throw new ValidationError("First name should be between 4 to 50 characters");
  }

  if (!validator.isStrongPassword(password)) {
    throw new ValidationError("Please enter a strong password");
  }

  const hash = await bcrypt.hash(password, 10);

  const user = new User({
    firstName,
    lastName,
    emailId: normalisedEmail,
    age,
    gender,
    password: hash,
  });
  await saveUser(user);

  try {
    const subject = "Welcome to DevConnect! 🚀";
    const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Welcome to DevConnect, ${firstName}! 🎉</h2>
        <p>We are absolutely thrilled to have you onboard.</p>
        <p>DevConnect helps you connect with developers worldwide, showcase your tech stack, and build together.</p>
        <a href="${config.github.appUrl || "https://dev-tinder-frontend-six-virid.vercel.app/"}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 15px;">Explore Developers</a>
        <p style="margin-top: 40px; font-size: 14px; color: #888;">
          Happy coding,<br/>
          <strong>The DevConnect Team</strong>
        </p>
      </div>
    `;
    await sendEmail(subject, body, normalisedEmail);
  } catch (error) {
    logger.warn("Failed to send welcome email", error);
  }

  const { acceptInviteByEmail } = await import("../services/invite.service.js");
  acceptInviteByEmail({ email: normalisedEmail, acceptedBy: user._id }).catch((e) =>
    logger.warn("Failed to accept pending invites", e)
  );

  await deleteOtpService(normalisedEmail, "signup");

  const token = await user.getJWT();
  return { user, token };
};

export const login = async ({ emailId, password }) => {
  const normalisedEmail = normaliseEmail(emailId);
  if (!normalisedEmail || !password) {
    throw new ValidationError("Email ID and password are required");
  }

  const user = await findUserByEmail(normalisedEmail);
  if (!user) {
    throw new ValidationError("Invalid credentials");
  }

  const valid = await user.validatePassword(password);
  if (!valid) {
    throw new ValidationError("Invalid credentials");
  }

  // [PHASE-3] Two-factor gate: password is correct, but a TOTP code is
  // required before any session is issued.
  if (await twoFactorService.isEnabledForUser(user._id)) {
    const tempToken = twoFactorService.createTempLoginToken(user._id);
    return { user: null, twoFactorRequired: true, tempToken };
  }

  user.lastSeenAt = new Date();
  await saveUser(user);

  const token = await user.getJWT();
  return { user, token };
};

export const verifyTwoFactorLogin = async ({ tempToken, token }) => {
  if (!tempToken || !token) {
    throw new ValidationError("Two-factor token and code are required");
  }

  const payload = twoFactorService.decodeTempLoginToken(tempToken);
  const user = await findUserById(payload._id);
  if (!user) {
    throw new AppError({ message: "User not found", statusCode: 404 });
  }
  if (!user.twoFactorEnabled) {
    throw new ValidationError("Two-factor authentication is not enabled");
  }

  await twoFactorService.verifyLoginCode({ userId: user._id, token });

  user.lastSeenAt = new Date();
  await saveUser(user);

  const accessToken = await user.getJWT();
  return { user, token: accessToken };
};

const getGoogleProfile = async (credential) => {
  if (!googleClient) {
    throw new AppError({ message: "Google OAuth not configured", statusCode: 500 });
  }
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new AppError({ message: "Google profile lacks email", statusCode: 400 });
  }
  return {
    email: payload.email,
    firstName: payload.given_name,
    lastName: payload.family_name,
    avatarUrl: payload.picture,
    providerId: payload.sub,
  };
};

const exchangeGitHubCodeForToken = async (code) => {
  if (!config.oauth.githubClientId || !config.oauth.githubClientSecret) {
    throw new AppError({ message: "GitHub OAuth not configured", statusCode: 500 });
  }
  const params = new URLSearchParams({
    client_id: config.oauth.githubClientId,
    client_secret: config.oauth.githubClientSecret,
    code,
  });
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: params,
  });
  if (!response.ok) {
    throw new AppError({ message: "Failed to exchange GitHub code", statusCode: 502 });
  }
  const data = await response.json();
  if (!data.access_token) {
    throw new AppError({ message: "GitHub access token missing", statusCode: 400 });
  }
  return data.access_token;
};

const fetchGithubUserProfile = async (accessToken) => {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "DevConnect-App",
  };
  const [profileRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", { headers }),
    fetch("https://api.github.com/user/emails", { headers }),
  ]);
  if (!profileRes.ok) {
    throw new AppError({ message: "Failed to fetch GitHub profile", statusCode: 502 });
  }
  const profile = await profileRes.json();
  let email = profile.email;
  if (!email) {
    if (!emailsRes.ok) {
      throw new AppError({ message: "Email access not granted on GitHub", statusCode: 400 });
    }
    const emails = await emailsRes.json();
    const primaryEmail = emails.find((item) => item.primary && item.verified);
    if (!primaryEmail) {
      throw new AppError({ message: "No verified email associated with GitHub account", statusCode: 400 });
    }
    email = primaryEmail.email;
  }
  return {
    email,
    firstName: profile.name?.split(" ")?.[0] ?? profile.login,
    lastName: profile.name?.split(" ")?.slice(1).join(" ") ?? "",
    avatarUrl: profile.avatar_url,
    providerId: profile.id,
    username: profile.login,
    accessToken,
  };
};

const upsertOAuthUser = async ({ email, firstName, lastName, avatarUrl, provider, providerId }) => {
  let user = await findUserByEmail(email);
  if (!user) {
    const randomPassword = crypto.randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 10);
    user = new User({
      firstName: firstName || "Developer",
      lastName,
      emailId: email,
      password: passwordHash,
      photoUrl: avatarUrl ? [avatarUrl] : undefined,
    });
  } else if (avatarUrl && (!user.photoUrl?.length || user.photoUrl[0].includes("ui-avatars"))) {
    user.photoUrl = [avatarUrl];
  }

  const providerIndex = user.oauthProviders.findIndex((item) => item.provider === provider);
  if (providerIndex === -1) {
    user.oauthProviders.push({ provider, providerId });
  } else {
    user.oauthProviders[providerIndex].providerId = providerId;
  }

  user.calculateProfileStrength();
  await saveUser(user);
  return user;
};

export const oauthLogin = async ({ provider, credential, code, accessToken }) => {
  if (!provider) {
    throw new ValidationError("provider is required");
  }

  let profile;

  if (provider === "google") {
    if (!credential) {
      throw new ValidationError("Google credential missing");
    }
    profile = await getGoogleProfile(credential);
  } else if (provider === "github") {
    let token = accessToken;
    if (!token) {
      if (!code) {
        throw new ValidationError("GitHub code or accessToken required");
      }
      token = await exchangeGitHubCodeForToken(code);
    }
    profile = await fetchGithubUserProfile(token);
  } else {
    throw new ValidationError("Unsupported provider");
  }

  const user = await upsertOAuthUser({
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    avatarUrl: profile.avatarUrl,
    provider,
    providerId: profile.providerId,
  });

  if (provider === "github" && profile.accessToken) {
    user.githubProfile = user.githubProfile || {};
    user.githubProfile.username = profile.username;
    user.githubProfile.lastSyncedAt = new Date();
    await saveUser(user);
  }

  const token = await user.getJWT();
  return { user, token };
};

export const generateAndStoreRefreshToken = async (user) => {
  const token = await user.getRefreshJWT();
  user.refreshToken = token;
  await saveUser(user);
  return token;
};

export const rotateRefreshToken = async (user) => {
  const token = await user.getRefreshJWT();
  user.refreshToken = token;
  await saveUser(user);
  return token;
};

export const clearRefreshToken = async (userId) => {
  await updateUserById(userId, { $set: { refreshToken: null } });
};

export const logout = async (userId) => {
  if (userId) {
    try {
      await updateUserById(userId, {
        $set: { isOnline: false, lastSeenAt: new Date(), refreshToken: null },
      });
    } catch (error) {
      logger.warn("Failed to mark user offline on logout", error);
    }
  }
  return { success: true };
};
