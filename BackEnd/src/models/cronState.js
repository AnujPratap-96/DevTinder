import mongoose from "mongoose";

const cronStateSchema = new mongoose.Schema({
  job: { type: String, unique: true, required: true },
  lastRunAt: { type: Date },
});

cronStateSchema.statics.ensureRun = async function (jobName) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const record = await this.findOne({ job: jobName });
  if (record && record.lastRunAt >= todayStart) {
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
