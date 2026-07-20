import mongoose from "mongoose";

const planLimitsSchema = new mongoose.Schema(
  {
    connectionRequestsPerDay: { type: Number, default: 0 },
    aiCallsPerDay: { type: Number, default: 0 },
    canCreateProjects: { type: Boolean, default: false },
    canChat: { type: Boolean, default: false },
    canViewProfileViews: { type: Boolean, default: false },
    blueBadge: { type: Boolean, default: false },
    themeAccess: { type: Boolean, default: false },
  },
  { _id: false }
);

const planSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },
    durationMonths: { type: Number, default: 0 },
    features: { type: [String], default: [] },
    badgeLabel: { type: String, default: "" },
    accentColor: { type: String, default: "#6366f1" },
    order: { type: Number, default: 0 },
    isFree: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    limits: { type: planLimitsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

planSchema.index({ order: 1 });

const Plan = mongoose.model("Plan", planSchema);

export default Plan;
export { planSchema, planLimitsSchema };
