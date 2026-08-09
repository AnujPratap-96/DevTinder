import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  APP_NAME,
  APP_URL,
  SUPPORT_EMAIL,
  LOGO_URL,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_COLOR,
  TEXT_SECONDARY,
  FOOTER_BACKGROUND,
} from "./constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "templates");

// Loaded once per process — templates live as plain HTML files in the
// templates folder, not inline in JS.
const cache = new Map();
const load = (name) => {
  if (!cache.has(name)) {
    cache.set(name, readFileSync(path.join(TEMPLATES_DIR, `${name}.html`), "utf8"));
  }
  return cache.get(name);
};

const interpolate = (template, vars = {}) =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : match
  );

/**
 * Render an email template.
 * @param {"otp"|"forgot-password"|"welcome"|"connection-request"|"match"|"project-invite"|"invite"} name
 * @param {object} vars Template-specific values ({{placeholder}} in the HTML file).
 */
const renderTemplate = (name, vars = {}) => {
  const layout = load("layout");

  const shared = {
    APP_NAME,
    APP_URL,
    SUPPORT_EMAIL,
    LOGO_URL,
    PRIMARY_COLOR,
    SECONDARY_COLOR,
    BACKGROUND_COLOR,
    CARD_BACKGROUND,
    TEXT_COLOR,
    TEXT_SECONDARY,
    FOOTER_BACKGROUND,
  };

  // Interpolate the content file first (its own {{placeholders}}), then the
  // layout — string.replace never recurses into replacement values.
  const content = interpolate(load(name), { ...shared, ...vars });

  const ctaButton = vars.ctaText && vars.ctaLink
    ? `<tr>
      <td align="center" style="padding: 24px 0;">
        <a href="${vars.ctaLink}" style="display: inline-block; padding: 14px 28px; background-color: ${PRIMARY_COLOR}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${vars.ctaText}</a>
      </td>
    </tr>`
    : "";

  return interpolate(layout, {
    ...shared,
    ...vars,
    content,
    ctaButton,
  });
};

export default renderTemplate;
