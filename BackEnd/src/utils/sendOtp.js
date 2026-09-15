import { emailQueue } from "./emailQueue.js";

export const sendOtpEmail = async (toEmail, otp, purpose = "signup") => {
  await emailQueue.add('send-otp-email', {
    type: 'OTP_EMAIL',
    payload: { toEmail, otp, purpose }
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
};

export const sendForgotPasswordEmail = async (toEmail, resetLink) => {
  await emailQueue.add('send-forgot-password-email', {
    type: 'FORGOT_PASSWORD',
    payload: { toEmail, resetLink }
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
};

export const sendWelcomeEmail = async (toEmail, firstName) => {
  await emailQueue.add('send-welcome-email', {
    type: 'WELCOME_EMAIL',
    payload: { toEmail, firstName }
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
};

export default {
  sendOtpEmail,
  sendForgotPasswordEmail,
  sendWelcomeEmail,
};
