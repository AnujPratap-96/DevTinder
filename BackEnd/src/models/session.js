import mongoose from "mongoose";

// [PHASE-3] Active session management — one doc per logged-in device.
// The refresh token lives here so multiple devices can stay signed in and
// each one can be revoked independently.
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    device: {
      type: String,
      default: "Unknown device",
    },
    ip: {
      type: String,
      default: "",
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, lastActiveAt: -1 });

const Session = mongoose.model("Session", sessionSchema);

export default Session;
export { sessionSchema };
