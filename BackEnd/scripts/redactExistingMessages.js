import mongoose from "mongoose";
import dotenv from "dotenv";
import Message from "../src/models/message.js";

dotenv.config();

// One-off cleanup: before E2E encryption was introduced, message bodies were
// stored in plaintext. Per the privacy requirement we remove them. Encrypted
// messages created by the new clients carry isEncrypted = true, so we only
// touch the legacy rows (isEncrypted false or missing) and overwrite their
// body with a redaction marker.
const REDACTION_MARKER = "[message removed]";

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured in .env");
  }

  await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 10 });
  console.log("Connected to MongoDB");

  const legacyFilter = {
    $or: [{ isEncrypted: { $ne: true } }, { isEncrypted: { $exists: false } }],
    message: { $nin: ["", null, REDACTION_MARKER] },
  };

  const count = await Message.countDocuments(legacyFilter);
  console.log(`Found ${count} plaintext message(s) to redact`);

  if (count > 0) {
    const result = await Message.updateMany(legacyFilter, {
      $set: { message: REDACTION_MARKER, isEncrypted: false },
    });
    console.log(`Redacted ${result.modifiedCount} message(s)`);
  }

  console.log("Done.");
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Redaction failed:", err);
  process.exit(1);
});
