import mongoose from "mongoose";

const cronStateSchema = new mongoose.Schema({
  job: { type: String, unique: true, required: true },
  lastRunAt: { type: Date },
});

cronStateSchema.statics.ensureRun = async function (jobName, intervalMs) {
  const now = new Date();
  const record = await this.findOne({ job: jobName });
  if (record && now.getTime() - record.lastRunAt.getTime() < intervalMs) {
    return false;
  }
  await this.updateOne(
    { job: jobName },
    { $set: { lastRunAt: now } },
    { upsert: true }
  );
  return true;
};

export default mongoose.model("CronState", cronStateSchema);
