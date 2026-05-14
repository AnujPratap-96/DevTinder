import mongoose from "mongoose";

import config from "./env.js";
import logger from "../utils/logger.js";

export const connectDB = async () => {
  if (!config.database.uri) {
    throw new Error("Database connection string is not configured (MONGO_URI)");
  }

  try {
    await mongoose.connect(config.database.uri, {
      maxPoolSize: 10,
    });
    logger.info("MongoDB connection established");
  } catch (error) {
    logger.error("Failed to connect to MongoDB", error);
    throw error;
  }
};

export default { connectDB };
