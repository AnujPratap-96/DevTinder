const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientMessageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    message: {
      type: String,
      trim: true,
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    delivered: {
      type: Boolean,
      default: false,
    },
    seen: {
      type: Boolean,
      default: false,
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    seenAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

messageSchema.index({ matchId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, seen: 1 });

messageSchema.statics.markAsDelivered = function ({ messageIds }) {
  if (!messageIds?.length) return Promise.resolve();
  return this.updateMany(
    { _id: { $in: messageIds }, delivered: false },
    { $set: { delivered: true, deliveredAt: new Date() } }
  ).exec();
};

messageSchema.statics.markAsSeen = function ({ matchId, receiverId }) {
  if (!matchId || !receiverId) return Promise.resolve({ modifiedCount: 0 });
  return this.updateMany(
    { matchId, receiverId, seen: false },
    { $set: { seen: true, seenAt: new Date(), delivered: true, deliveredAt: new Date() } }
  ).exec();
};

const Message = mongoose.model("Message", messageSchema);

module.exports = { Message };
