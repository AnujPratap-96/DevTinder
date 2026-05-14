import http from "http";
import app from "./app.js";
import config from "./config/env.js";
import { connectDB } from "./config/database.js";
import { initializeSocket } from "./utils/socket.js";
import logger from "./utils/logger.js";
import User from "./models/user.model.js";

/**
 * On startup, any user whose isOnline flag is still true is a ghost —
 * the server restarted and their socket disconnect event was never fired.
 * Reset them all to offline immediately.
 */
const resetStaleOnlineUsers = async () => {
  try {
    const result = await User.updateMany(
      { isOnline: true },
      { $set: { isOnline: false, lastSeenAt: new Date() } }
    );
    if (result.modifiedCount > 0) {
      logger.info(`Reset ${result.modifiedCount} stale online user(s) to offline on startup`);
    }
  } catch (error) {
    logger.warn("Failed to reset stale online users on startup", error);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    await resetStaleOnlineUsers();
    const server = http.createServer(app);
    initializeSocket(server);

    server.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error("Server failed to start", error);
    process.exit(1);
  }
};

startServer();
