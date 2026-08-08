import mongoose from "mongoose";

const callSessionSchema = new mongoose.Schema(
  {
    callId: { type: String, required: true, unique: true, index: true },
    callerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    calleeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", default: null },
    type: { type: String, enum: ["voice", "video"], required: true },
    status: {
      type: String,
      enum: ["ringing", "accepted", "declined", "missed", "completed", "cancelled"],
      default: "ringing",
      index: true,
    },
    startedAt: { type: Date, default: null },
    connectedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    durationSec: { type: Number, default: 0 },
    endReason: {
      type: String,
      enum: ["hangup", "decline", "busy", "timeout", "error", "network", null],
      default: null,
    },
    ack: { type: Boolean, default: false },
  },
  { timestamps: true }
);

callSessionSchema.index({ calleeId: 1, status: 1 });
callSessionSchema.index({ callerId: 1, createdAt: -1 });
callSessionSchema.index({ calleeId: 1, createdAt: -1 });

callSessionSchema.methods.finalize = function (reason) {
  this.endedAt = new Date();
  this.status = reason === "decline" ? "declined" : reason === "timeout" ? "missed" : reason === "busy" ? "cancelled" : "completed";
  this.endReason = reason;
  if (this.connectedAt) {
    this.durationSec = Math.max(0, Math.round((this.endedAt - this.connectedAt) / 1000));
  }
  return this.save();
};

const CallSession = mongoose.model("CallSession", callSessionSchema);

export default CallSession;
