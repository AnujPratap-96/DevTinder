import { APP_NAME, APP_URL, PRIMARY_COLOR, generateBaseTemplate } from "./baseTemplate.js";

export const otpEmailTemplate = ({ otp, purpose }) => {
  const isLogin = purpose === "login";
  const title = isLogin ? "Your Login OTP" : "Your Verification OTP";

  const content = isLogin
    ? `<p>Your login verification code is below. This code will expire in 5 minutes.</p>`
    : `<p>Your account verification code is below. This code will expire in 5 minutes.</p>`;

  const otpDisplay = `
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
      <tr>
        <td align="center" style="padding: 20px;">
          <div style="
            display: inline-block;
            padding: 20px 32px;
            background: linear-gradient(135deg, ${PRIMARY_COLOR}, #8b5cf6);
            border-radius: 12px;
            font-size: 36px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          ">${otp}</div>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom: 16px;">
          <p style="margin: 0; font-size: 13px; color: #64748b;">Enter this code in the app to continue</p>
        </td>
      </tr>
    </table>
  `;

  return generateBaseTemplate({
    title,
    content: content + otpDisplay,
  });
};

export const forgotPasswordTemplate = ({ resetLink }) => {
  const title = "Reset Your Password";
  const content = `
    <p>You requested to reset your password. Click the button below to create a new password.</p>
    <p style="font-size: 13px; color: #64748b; margin-top: 16px;">This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
  `;

  return generateBaseTemplate({
    title,
    content,
    ctaText: "Reset Password",
    ctaLink: resetLink,
  });
};

export const welcomeEmailTemplate = ({ firstName }) => {
  const title = `Welcome to ${APP_NAME}! 🎉`;
  const content = `
    <p>Hi <strong>${firstName}</strong>,</p>
    <p>Welcome to DevTinder — the platform where developers connect, collaborate, and build together!</p>
    <p>Here's what you can do:</p>
    <ul style="text-align: left; color: #1e293b; line-height: 1.8;">
      <li>Swipe and connect with developers</li>
      <li>Join collaborative projects</li>
      <li>Chat and network</li>
      <li>Build amazing things together</li>
    </ul>
    <p>Let's get started!</p>
  `;

  return generateBaseTemplate({
    title,
    content,
    ctaText: "Explore Now",
    ctaLink: APP_URL,
  });
};

export const connectionRequestTemplate = ({ senderName }) => {
  const title = "New Connection Request";
  const content = `
    <p><strong>${senderName}</strong> wants to connect with you!</p>
    <p>Accept their request to start a conversation and build together.</p>
  `;

  return generateBaseTemplate({
    title,
    content,
    ctaText: "View Requests",
    ctaLink: `${APP_URL}/requests`,
  });
};

export const matchEmailTemplate = ({ matchName }) => {
  const title = "It's a Match! 💫";
  const content = `
    <p>You and <strong>${matchName}</strong> liked each other!</p>
    <p>Start a conversation and see what you can build together.</p>
  `;

  return generateBaseTemplate({
    title,
    content,
    ctaText: "Say Hello",
    ctaLink: `${APP_URL}/messages`,
  });
};

export const projectInviteTemplate = ({ projectTitle, ownerName }) => {
  const title = "Project Invitation";
  const content = `
    <p><strong>${ownerName}</strong> invited you to join their project: <strong>${projectTitle}</strong></p>
    <p>Check it out and join the collaboration!</p>
  `;

  return generateBaseTemplate({
    title,
    content,
    ctaText: "View Project",
    ctaLink: `${APP_URL}/projects`,
  });
};

export const inviteEmailTemplate = ({ senderName }) => {
  const title = "You're Invited to DevTinder!";
  const content = `
    <p>Hi there,</p>
    <p><strong>${senderName}</strong> has invited you to join <strong>${APP_NAME}</strong> — the platform where developers connect, collaborate, and build together.</p>
    <p>Here's what you can do on DevTinder:</p>
    <ul style="text-align: left; color: #1e293b; line-height: 1.8;">
      <li>Swipe and connect with like-minded developers</li>
      <li>Join collaborative projects</li>
      <li>Chat, voice & video call with your network</li>
      <li>Showcase your tech stack and find your next teammate</li>
    </ul>
    <p>Come join us — we'd love to have you!</p>
  `;

  return generateBaseTemplate({
    title,
    content,
    ctaText: "Join DevTinder",
    ctaLink: `${APP_URL}/register`,
  });
};

export default {
  otpEmailTemplate,
  forgotPasswordTemplate,
  welcomeEmailTemplate,
  connectionRequestTemplate,
  matchEmailTemplate,
  projectInviteTemplate,
  inviteEmailTemplate,
};
