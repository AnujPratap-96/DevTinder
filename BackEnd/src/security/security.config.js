/**
 * security.config.js — [PHASE-3] Trust, Safety & Account Security feature flags.
 * Set any flag to false to disable that feature without touching code.
 */
const SECURITY = {
  enabled: true,
  twoFactor: {
    enabled: true,
    tempTokenTtl: "5m",
    issuer: "DevTinder",
  },
  sessions: {
    enabled: true,
    maxPerUser: 10,
    ttlDays: 7,
  },
  moderation: {
    enabled: true,
    // Flag-only pipeline: messages are NEVER auto-blocked. AI moderation is
    // intentionally off by default (keyword scan is instant, zero latency);
    // set aiEnabled true + MISTRAL_API_KEY to route plaintext through Mistral.
    aiEnabled: false,
    maxFlagsPerMessage: 5,
  },
  anonymizedBrowsing: {
    enabled: true,
  },
};

export default SECURITY;
