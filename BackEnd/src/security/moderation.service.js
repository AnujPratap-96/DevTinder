import SECURITY from "./security.config.js";

// [PHASE-3] Flag-only moderation: matches are stored on the message doc as
// `moderation.flags` so an admin can review them. Messages are NEVER
// auto-blocked or auto-hidden — the flag is advisory.
const PATTERNS = [
  { flag: "harassment", regex: /\b(kill\s+yourself|kys|idiot|stupid|worthless|loser|hate\s+you)\b/i },
  { flag: "slur", regex: /\b(n\w*[aeiou]+\w*g\w*er|f\w*gg\w*ot|retard(?:ed)?)\b/i },
  { flag: "spam", regex: /\b(buy\s+(?:now|cheap)|earn\s+\$\d+|\$\d+\s*(?:per|a|every)\s+\w+|casino|lottery|jackpot|bitcoin\s+to\s+\d+)\b/i },
  { flag: "scam", regex: /https?:\/\/[^\s]*(?:giveaway|free-\w+|win-\w+|\w+-\d{2,})[^\s]*/i },
  { flag: "phone_harvest", regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/ },
  { flag: "email_harvest", regex: /\b[a-z0-9._%+-]+@[a-z0-9.-]{4,}\.[a-z]{2,}\b/i },
  { flag: "explicit", regex: /\b(fuck(?:ing)?|shit|bitch|asshole|dick|porn|nsfw)\b/i },
];

const compilePatterns = () => PATTERNS.map(({ flag, regex }) => ({ flag, regex }));

export const moderateText = async ({ text, messageType = "text" }) => {
  const empty = { flagged: false, flags: [] };
  if (!SECURITY.enabled || !SECURITY.moderation.enabled) return empty;

  const content = String(text ?? "").trim();
  if (!content || messageType !== "text") return empty;

  const flags = [];
  for (const { flag, regex } of compilePatterns()) {
    const matches = content.match(regex);
    if (matches?.length) {
      flags.push(flag);
      if (flags.length >= SECURITY.moderation.maxFlagsPerMessage) break;
    }
  }

  return flags.length ? { flagged: true, flags } : empty;
};

export const buildModerationUpdate = async ({ text, messageType }) => {
  const result = await moderateText({ text, messageType });
  if (!result.flagged) return {};
  return {
    "moderation.flagged": true,
    "moderation.flags": result.flags,
  };
};

export default { moderateText, buildModerationUpdate };
