import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  emailId: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ["signup", "login", "reset-password"],
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // 300 seconds = 5 minutes
  },
});

otpSchema.index({ emailId: 1, purpose: 1 });

const Otp = mongoose.model("Otp", otpSchema);

export default Otp;
export { otpSchema };
