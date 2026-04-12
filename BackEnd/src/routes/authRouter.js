const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user");
const Otp = require("../models/otp.model");
const validator = require("validator");
const generateOtp = require("../utils/generateOtp");
const { sendOtpEmail, sendForgotPasswordEmail } = require("../utils/sendOtp");
const {generateSignJWT, verifySignJWT} = require("../middlewares/signupauth");
const asyncHandler = require("express-async-handler");
const rateLimit = require("express-rate-limit");
const { validateSignUpData } = require("../utils/validation");
const otpService = require("../services/otpService");
const { APP_URL } = require("../utils/emailTemplates/baseTemplate");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10, // 10 requests per IP
  message: { error: "Too many requests from this IP, please try again later." }
});

const authRouter = express.Router();

const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many OTP requests. Please try again later." },
  keyGenerator: (req) => req.body.email,
});

authRouter.post("/send-otp", otpRateLimiter, asyncHandler(async (req, res) => {
  const { email, purpose } = req.body;
  
  if (!email || !purpose) {
    return res.status(400).json({ error: "Email and purpose are required" });
  }
  
  if (!["signup", "login", "reset-password"].includes(purpose)) {
    return res.status(400).json({ error: "Invalid purpose" });
  }
  
  if (purpose === "signup") {
    const existingUser = await User.findOne({ emailId: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "User already registered" });
    }
  }
  
  if (purpose === "reset-password") {
    const existingUser = await User.findOne({ emailId: email.toLowerCase() });
    if (!existingUser) {
      return res.status(404).json({ error: "No account found with this email" });
    }
  }
  
  await otpService.generateOtpService(email, purpose);
  
  res.status(200).json({ message: "OTP sent to your email!" });
}));

authRouter.post("/verify-otp", asyncHandler(async (req, res) => {
  const { email, otp, purpose } = req.body;
  
  if (!email || !otp || !purpose) {
    return res.status(400).json({ error: "Email, OTP and purpose are required" });
  }
  
  try {
    const result = await otpService.verifyOtpService(email, otp, purpose);
    res.status(200).json({ message: "OTP verified successfully", verified: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}));

authRouter.post("/reset-password", asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;
  
  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email and new password are required" });
  }
  
  if (!validator.isStrongPassword(newPassword)) {
    return res.status(400).json({ error: "Password is not strong enough" });
  }
  
  const isVerified = await otpService.isOtpVerified(email, "reset-password");
  if (!isVerified) {
    return res.status(400).json({ error: "Please verify OTP first" });
  }
  
  const user = await User.findOne({ emailId: email.toLowerCase() });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  
  const passwordHash = await bcrypt.hash(newPassword, 10);
  user.password = passwordHash;
  await user.save();
  
  await otpService.deleteOtpService(email, "reset-password");
  
  res.status(200).json({ message: "Password reset successfully" });
}));

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const getGoogleProfile = async (credential) => {
  if (!googleClient) {
    throw new Error("Google OAuth not configured");
  }
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error("Google profile lacks email");
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
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    throw new Error("GitHub OAuth not configured");
  }
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    code,
  });
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: params,
  });
  if (!response.ok) {
    throw new Error("Failed to exchange GitHub code");
  }
  const data = await response.json();
  if (!data.access_token) {
    throw new Error("GitHub access token missing");
  }
  return data.access_token;
};

const fetchGithubUserProfile = async (accessToken) => {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "DevTinder-App",
  };
  const [profileRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", { headers }),
    fetch("https://api.github.com/user/emails", { headers }),
  ]);
  if (!profileRes.ok) {
    throw new Error("Failed to fetch GitHub profile");
  }
  const profile = await profileRes.json();
  let email = profile.email;
  if (!email) {
    if (!emailsRes.ok) {
      throw new Error("Email access not granted on GitHub");
    }
    const emails = await emailsRes.json();
    const primaryEmail = emails.find((item) => item.primary && item.verified);
    if (!primaryEmail) {
      throw new Error("No verified email associated with GitHub account");
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
  let user = await User.findOne({ emailId: email });
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
  await user.save();
  return user;
};


authRouter.post("/register", authLimiter, asyncHandler(async (req, res ) => {
   const { emailId } = req.body;
  if(!emailId) {
    return res.status(400).json({ error: "Email ID is required" });
  }
  if(!validator.isEmail(emailId)) {
    return res.status(400).json({ error: "Invalid Email ID" });
  }
  //? Checking if user already registered.

  const user = await User.findOne({ emailId: emailId });

  if(user){
    return res.status(400).json({ error: "User already registered" });
  }

  const otp = generateOtp();

  const otpEntry = new Otp({
    emailId: emailId,
    otp: otp,
  });

  await otpEntry.save();
  await sendOtpEmail(emailId, otp);
  const token = await generateSignJWT(emailId);
  res.cookie("signup_token", token , {
    expires: new Date(Date.now() + 60 * 60000), // 60 minutes
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  })
  res.status(200).json({ message: "OTP sent to your email!" , token :token });
}));

authRouter.post("/verify-otp", authLimiter, verifySignJWT, asyncHandler(async (req, res) => {
    const { otp} = req.body; 
    const emailId = req.emailId;
    if(!emailId || !otp){
      return res.status(400).json({ error: "Email ID and OTP are required" });
    }

   const otpEntry = await Otp.findOne({ emailId: emailId, otp: otp });
   if (!otpEntry) {
       return res.status(400).json({ error: "Invalid OTP" });
   }

   await Otp.deleteOne({ _id: otpEntry._id });
  
   res.status(200).json({ message: "OTP verified successfully", verified:true });
}));

authRouter.post("/complete-signup",verifySignJWT, validateSignUpData, asyncHandler(async (req, res) => {
  const passwordHash = await bcrypt.hash(req.body.password, 10);

  //? creating a new instance of User Model
  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    emailId: req.emailId,
    age: req.body.age,
    gender: req.body.gender,
    password: passwordHash,
  });

  await user.save();
  const token = await user.getJWT();
  
  res.cookie("token", token, {
    expires: new Date(Date.now() + 8 * 3600000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
    res.clearCookie("signup_token");
  
  res.status(200).json({
    message: "User added succesfully",
  });
}));

authRouter.post("/login", authLimiter, asyncHandler(async (req, res) => {
    //? Finding User in DB by emailId
    const { emailId, password } = req.body;
    const user = await User.findOne({ emailId: emailId });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    //* Comparing the password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    user.lastSeenAt = new Date();
    user.isOnline = true;
    await user.save();

    //? Generating JWT Token
    const token = await user.getJWT();
    //? Setting the token in cookie
    res.cookie("token", token, {
      expires: new Date(Date.now() + 8 * 3600000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      // Allows cookies in cross-origin requests
    });
    res.status(200).json({ message: "User Logged In Successfully",
    user : user

     });
}));

authRouter.post("/auth/oauth", asyncHandler(async (req, res) => {
  const { provider, credential, code, accessToken } = req.body ?? {};
  if (!provider) {
    return res.status(400).json({ message: "provider is required" });
  }

  let profile;

  if (provider === "google") {
    if (!credential) {
      return res.status(400).json({ message: "Google credential missing" });
    }
    profile = await getGoogleProfile(credential);
  } else if (provider === "github") {
    let token = accessToken;
    if (!token) {
      if (!code) {
        return res.status(400).json({ message: "GitHub code or accessToken required" });
      }
      token = await exchangeGitHubCodeForToken(code);
    }
    profile = await fetchGithubUserProfile(token);
  } else {
    return res.status(400).json({ message: "Unsupported provider" });
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
    await user.save();
  }

  const token = await user.getJWT();
  res.cookie("token", token, {
    expires: new Date(Date.now() + 8 * 3600000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({ message: "OAuth login successful", user });
}));

authRouter.post("/logout", asyncHandler(async (req, res) => {
    res.cookie("token", "", {
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.json({message :  "User Logged Out Successfully"});
}));

module.exports = authRouter;
