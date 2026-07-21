const APP_NAME = "DevTinder";
const APP_URL = "https://devtinder.online";
const SUPPORT_EMAIL = "support@dev-tinder-frontend-six-virid.vercel.app";
const LOGO_URL = "https://devtinder.online/logo.png";

const PRIMARY_COLOR = "#6366f1";
const SECONDARY_COLOR = "#8b5cf6";
const BACKGROUND_COLOR = "#f8fafc";
const CARD_BACKGROUND = "#ffffff";
const TEXT_COLOR = "#1e293b";
const TEXT_SECONDARY = "#64748b";
const FOOTER_BACKGROUND = "#f1f5f9";

const generateBaseTemplate = ({ title, content, ctaText, ctaLink }) => {
  const ctaButton = ctaText && ctaLink ? `
    <tr>
      <td align="center" style="padding: 24px 0;">
        <a href="${ctaLink}" style="
          display: inline-block;
          padding: 14px 28px;
          background-color: ${PRIMARY_COLOR};
          color: #ffffff;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
        ">${ctaText}</a>
      </td>
    </tr>
  ` : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | ${APP_NAME}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BACKGROUND_COLOR}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color: ${BACKGROUND_COLOR};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width: 600px; background-color: ${CARD_BACKGROUND}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 40px 24px; text-align: center; background: linear-gradient(135deg, ${PRIMARY_COLOR}, ${SECONDARY_COLOR});">
              <a href="${APP_URL}" style="text-decoration: none;">
                <span style="font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${APP_NAME}</span>
              </a>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: ${TEXT_COLOR}; text-align: center;">${title}</h1>
              
              <div style="font-size: 16px; line-height: 1.6; color: ${TEXT_COLOR};">
                ${content}
              </div>
              
              ${ctaButton}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: ${FOOTER_BACKGROUND}; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 13px; color: ${TEXT_SECONDARY};">
                <strong>${APP_NAME}</strong> — Connect with Developers
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: ${TEXT_SECONDARY};">
                <a href="${SUPPORT_EMAIL}" style="color: ${PRIMARY_COLOR}; text-decoration: none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: ${TEXT_SECONDARY};">
                If you didn't request this email, please ignore it.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Bottom spacing -->
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
          <tr>
            <td height="40"></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

export {
  APP_NAME,
  APP_URL,
  SUPPORT_EMAIL,
  LOGO_URL,
  PRIMARY_COLOR,
  generateBaseTemplate,
};
