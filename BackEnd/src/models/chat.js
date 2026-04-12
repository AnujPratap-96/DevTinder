const mongoose = require("mongoose");

const buildMatchKey = (userIds = []) =>
  userIds
    .map((id) => id.toString())
    .sort()
    .join(":");

const chatSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      ],
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: "A chat must contain exactly two participants",
      },
    },
    matchKey: {
      type: String,
      unique: true,
      required: true,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

chatSchema.statics.findOrCreateByParticipants = async function (userId, targetUserId) {
  if (!userId || !targetUserId) {
    throw new Error("userId and targetUserId are required");
  }

  const matchKey = buildMatchKey([userId, targetUserId]);

  let chat = await this.findOne({ matchKey });
  if (!chat) {
    chat = await this.create({ participants: [userId, targetUserId], matchKey });
  }
  return chat;
};

chatSchema.statics.getByMatchId = function (matchId) {
  return this.findById(matchId).lean();
};

chatSchema.methods.getRoomId = function () {
  return this._id.toString();
};

chatSchema.pre("validate", function (next) {
  if (!this.matchKey && this.participants?.length === 2) {
    this.matchKey = buildMatchKey(this.participants);
  }
  next();
});

chatSchema.index({ lastMessageAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);

module.exports = { Chat, buildMatchKey };
