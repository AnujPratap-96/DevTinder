/**
 * enhancement.config.js — Phase-1 feature flags (chat enhancements).
 * Set any flag to false to disable that feature without touching code.
 */
const ENHANCEMENTS = {
  enabled: true,
  voiceNotes: {
    enabled: true,
    maxFileSizeMb: 5,
    maxDurationSec: 60,
    folder: "DevTinder/voice-notes",
  },
  reactions: {
    enabled: true,
    maxPerMessage: 20,
    allowedEmojis: ["👍", "❤️", "😂", "🎉", "🔥", "👀", "🚀", "💡"],
  },
  chatSearch: {
    enabled: true,
    maxResults: 20,
  },
  chatPrefs: {
    enabled: true,
  },
};

export default ENHANCEMENTS;
