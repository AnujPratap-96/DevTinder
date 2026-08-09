/**
 * Feature flags for chat extras (voice notes, reactions, search, prefs).
 * Set any flag to false to disable that feature without touching code.
 */
const FEATURES = {
  voiceNotes: {
    enabled: true,
    maxFileSizeMb: 5,
    maxDurationSec: 60,
    folder: "DevTinder/voice-notes",
  },
  reactions: {
    enabled: true,
    maxPerMessage: 20,
    // Instagram-style quick reactions (double-tap default is the first: ❤️)
    allowedEmojis: ["❤️", "😍", "😂", "😮", "😢", "👍", "👏"],
  },
  chatSearch: {
    enabled: true,
    maxResults: 20,
  },
  chatPrefs: {
    enabled: true,
  },
};

export default FEATURES;
