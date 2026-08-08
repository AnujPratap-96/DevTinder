/**
 * enhancement.socket.js — Phase-1 realtime chat enhancement events.
 * Registers exactly one new event (message:react) and never touches
 * existing socket handlers.
 */
import { addReaction } from "./enhancement.service.js";
import logger from "../utils/logger.js";

export const initializeEnhancementSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("message:react", async ({ matchId, messageId, emoji } = {}) => {
      const userId = socket.data.userId;
      if (!userId || !matchId || !messageId || !emoji) return;
      try {
        await addReaction({ userId, matchId, messageId, emoji });
      } catch (err) {
        logger.warn("[enhancement] reaction failed user=%s msg=%s err=%s", userId, messageId, err.message);
        socket.emit("chat:error", { message: err.message, code: err.code });
      }
    });
  });
};

export default initializeEnhancementSocket;
