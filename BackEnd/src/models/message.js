import mongoose from "mongoose";

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
      // `call` entries carry their details in `metadata.callDetails` and have
      // no textual body — every other message type still requires text.
      required: function () {
        return this.messageType !== "call";
      },
    },
    // When true the `message` field holds base64(iv|ciphertext) produced
    // client-side; the server never sees plaintext. Legacy/redacted rows are
    // false so clients know not to attempt decryption.
    isEncrypted: {
      type: Boolean,
      default: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "call", "audio"],
      default: "text",
    },
    // ── [PHASE-1] additive fields ──────────────────────────────────────────
    // Emoji reactions (one entry per user per emoji).
    reactions: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          emoji: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    // Timestamp set when the sender pins the message (null = not pinned).
    pinnedAt: {
      type: Date,
      default: null,
    },
    // ── [/PHASE-1] ────────────────────────────────────────────────────────
    // ── [PHASE-3] moderation flags (flag-only, never auto-block) ──────────
    moderation: {
      flagged: { type: Boolean, default: false },
      flags: { type: [String], default: [] },
      reviewedAt: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    // ── [/PHASE-3] ────────────────────────────────────────────────────────
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

export { Message };
export default Message;
