import mongoose from "mongoose";

// [PHASE-3] TOTP 2FA key storage — kept in a separate collection so the
// secret can never leak through user-doc responses (feed, search, etc.).
const twoFactorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    secret: {
      type: String,
      default: null,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    enabledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const TwoFactor = mongoose.model("TwoFactor", twoFactorSchema);

export default TwoFactor;
export { twoFactorSchema };
