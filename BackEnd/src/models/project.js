import mongoose from "mongoose";

const projectMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
  joinedAt: { type: Date, default: Date.now },
});

const joinRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  requestedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const projectMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true, trim: true },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    techStack: {
      type: [String],
      default: [],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: {
      type: [projectMemberSchema],
      default: [],
    },
    joinRequests: {
      type: [joinRequestSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "completed"],
      default: "open",
    },
    messages: [projectMessageSchema],
    roadmap: {
      type: [
        {
          title: { type: String, required: true },
          tasks: { type: [String], default: [] },
        },
      ],
      default: null,
    },
  },
  { timestamps: true }
);

projectSchema.index({ ownerId: 1, status: 1 });
projectSchema.index({ "members.userId": 1 });
projectSchema.index({ "joinRequests.userId": 1, "joinRequests.status": 1 });

projectSchema.methods.getUserRole = function (userId) {
  const member = this.members.find((m) => {
    const memberUserId = typeof m === "object" ? m?.userId : m;
    return memberUserId?.toString() === userId.toString();
  });
  return member?.role ?? null;
};

projectSchema.methods.isMember = function (userId) {
  return this.members.some((m) => {
    const memberUserId = typeof m === "object" ? m?.userId : m;
    if (!memberUserId) return false;
    return memberUserId.toString() === userId.toString();
  });
};

projectSchema.methods.hasPendingRequest = function (userId) {
  return this.joinRequests.some((r) => {
    const requestUserId = typeof r?.userId === "object" ? r?.userId : r?.userId;
    if (!requestUserId) return false;
    return requestUserId.toString() === userId.toString() && r.status === "pending";
  });
};

const Project = mongoose.model("Project", projectSchema);

export default Project;
export {
  projectSchema,
  projectMemberSchema,
  joinRequestSchema,
  projectMessageSchema,
};
