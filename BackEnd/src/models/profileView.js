const mongoose = require("mongoose");

const profileViewSchema = new mongoose.Schema(
  {
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    viewedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

profileViewSchema.index({ viewerId: 1, viewedUserId: 1 }, { unique: true });
profileViewSchema.index({ viewedUserId: 1, viewedAt: -1 });

const ProfileView = mongoose.model("ProfileView", profileViewSchema);

module.exports = ProfileView;
