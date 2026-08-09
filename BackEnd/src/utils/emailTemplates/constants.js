import config from "../../config/env.js";

export const APP_NAME = "DevTinder";
// Live frontend. devtinder.online was the old branding domain and is not
// deployed anymore — emails must link to the real Vercel site. Override via
// FRONTEND_URL if a custom domain is added later.
export const APP_URL = config.frontendUrl;
export const SUPPORT_EMAIL = "support@devtinder.app";
export const LOGO_URL = `${APP_URL}/logo.png`;

export const PRIMARY_COLOR = "#6366f1";
export const SECONDARY_COLOR = "#8b5cf6";
export const BACKGROUND_COLOR = "#f8fafc";
export const CARD_BACKGROUND = "#ffffff";
export const TEXT_COLOR = "#1e293b";
export const TEXT_SECONDARY = "#64748b";
export const FOOTER_BACKGROUND = "#f1f5f9";
