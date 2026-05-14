import mongoose from "mongoose";
import validator from "validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import config from "../config/env.js";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 4,
      maxLength: 20,
    },
    lastName: {
      type: String,
    },
    emailId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid Email");
        }
      },
    },
    password: {
      type: String,
      required: true,
      minLength: 8,
    },
    age: {
      type: Number,
      min: 18,
    },
    gender: {
      type: String,
      lowercase: true,
      enum: {
        values: ["male", "female", "other"],
        message: "{VALUE} is not supported",
      },
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    membershipType: {
      type: String,
      enum: {
        values: ["free", "silver", "gold"],
        message: "{VALUE} is not supported",
      },
      default: "free",
    },
    photoUrl: {
      type: [String],
      default: ["https://ui-avatars.com/api/?name=User&background=random"],
      validate (value) {
        if (!value.every((url) => validator.isURL(url))) {
          throw new Error("Invalid URL");
        }
      },
    },
    about: {
      type: String,
      default: "This is a default about the user",
    },
    skills: {
      type: [String],
    },
    role: {
      type: String,
      enum: [
        "frontend",
        "backend",
        "fullstack",
        "mobile",
        "design",
        "product",
        "data",
        "devops",
        "other",
      ],
      default: "fullstack",
    },
    experienceYears: {
      type: Number,
      min: 0,
      default: 0,
    },
    githubProfile: {
      username: { type: String, trim: true },
      token: { type: String, trim: true },
      avatarUrl: { type: String, trim: true },
      repos: {
        type: [
          {
            name: String,
            htmlUrl: String,
            description: String,
            stargazersCount: Number,
            language: String,
            updatedAt: Date,
          },
        ],
        default: [],
      },
      stats: {
        totalStars: { type: Number, default: 0 },
        topLanguages: { type: [String], default: [] },
        followers: { type: Number, default: 0 },
      },
      lastSyncedAt: Date,
    },
    profileStrength: {
      score: { type: Number, min: 0, max: 100, default: 0 },
      missingFields: { type: [String], default: [] },
      lastEvaluatedAt: Date,
    },
    availability: {
      type: String,
      enum: ["open", "busy", "not_looking"],
      default: "open",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    blockedUsers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      city: String,
      country: String,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    theme: {
      type: String,
      enum: ["default", "glassmorphism", "matrix", "neon", "cyberpunk", "minimal", "hacker"],
      default: "default",
    },
    endorsements: [
      {
        skill: String,
        endorsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        _id: false
      }
    ],
    oauthProviders: {
      type: [
        {
          provider: { type: String, enum: ["google", "github"] },
          providerId: { type: String },
          accessToken: { type: String },
          refreshToken: { type: String },
          expiresAt: { type: Date },
        },
      ],
      default: [],
    },
    bookmarks: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    socialLinks: {
      github: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      portfolio: { type: String, trim: true },
    },
    endorsements: {
      type: [
        {
          skill: { type: String, required: true },
          endorsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.index({ firstName: "text", lastName: "text", skills: "text" });
userSchema.index({ location: "2dsphere" });
userSchema.index({ role: 1 });
userSchema.index({ availability: 1 });

userSchema.pre("save", function (next) {
  if (this.location && this.location.type === "Point" && !this.location.coordinates) {
    this.location.coordinates = [0, 0];
  }
  if (!this.profileStrength?.score || this.profileStrength?.score === 0) {
    this.calculateProfileStrength();
  }
  next();
});

userSchema.methods.getJWT = async function () {
  const user = this;
  const secret = config.jwt.secret;
  if (!secret) {
    throw new Error("JWT secret is not configured");
  }
  const token = await jwt.sign({ _id: user._id }, secret, {
    expiresIn: config.jwt.expiresIn,
  });
  return token;
};

userSchema.methods.validatePassword = async function (passwordByUser) {
  const user = this;
  const isValidPassword = await bcrypt.compare(passwordByUser, user.password);
  return isValidPassword;
};

userSchema.methods.calculateProfileStrength = function () {
  const requiredFields = [
    { key: "firstName", weight: 15 },
    { key: "lastName", weight: 5 },
    { key: "about", weight: 15 },
    { key: "skills", weight: 15 },
    { key: "photoUrl", weight: 10 },
    { key: "githubProfile.username", weight: 10 },
    { key: "experienceYears", weight: 10 },
    { key: "role", weight: 10 },
    { key: "gender", weight: 5 },
    { key: "age", weight: 5 },
  ];

  let score = 0;
  const missingFields = [];
  const getNestedValue = (obj, path) => path.split(".").reduce((acc, part) => acc?.[part], obj);

  requiredFields.forEach(({ key, weight }) => {
    const value = getNestedValue(this, key);
    let hasValue = false;

    if (value === undefined || value === null) {
      hasValue = false;
    } else if (Array.isArray(value)) {
      hasValue = value.length > 0;
    } else if (typeof value === "string") {
      hasValue = value.trim().length > 0;
    } else {
      hasValue = !!value;
    }

    if (hasValue) {
      score += weight;
    } else {
      missingFields.push(key);
    }
  });

  score = Math.min(score, 100);

  this.profileStrength = {
    score,
    missingFields,
    lastEvaluatedAt: new Date(),
  };
  return this.profileStrength;
};

const User = mongoose.model("User", userSchema);

export default User;
export { userSchema };
