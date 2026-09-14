import SibApiV3Sdk from "sib-api-v3-sdk";

import renderTemplate from "./emailTemplates/renderTemplate.js";
import { APP_URL } from "./emailTemplates/constants.js";
import config from "../config/env.js";
import logger from "./logger.js";

const purposeIntro = {
  signup: "Your account verification code is below. This code will expire in 5 minutes.",
  login: "Your login verification code is below. This code will expire in 5 minutes.",
  "reset-password": "Your password reset code is below. This code will expire in 5 minutes.",
};

export const sendOtpEmail = async (toEmail, otp, purpose = "signup") => {
  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications["api-key"].apiKey = config.email.brevoApiKey;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const purposeMap = {
      signup: { subject: "Your DevConnect Verification OTP" },
      login: { subject: "Your DevConnect Login OTP" },
      "reset-password": { subject: "Your DevConnect Password Reset OTP" },
    };

    const template = purposeMap[purpose] || purposeMap.signup;

    await emailApi.sendTransacEmail({
      to: [{ email: toEmail }],
      sender: {
        name: "DevConnect",
        email: "officialthakur94@gmail.com",
      },
      subject: template.subject,
      htmlContent: renderTemplate("otp", {
        intro: purposeIntro[purpose] || purposeIntro.signup,
        otp,
      }),
    });
  } catch (error) {
    logger.error("Failed to send OTP email", error);
    throw new Error("Email send failed.");
  }
};

export const sendForgotPasswordEmail = async (toEmail, resetLink) => {
  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications["api-key"].apiKey = config.email.brevoApiKey;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    await emailApi.sendTransacEmail({
      to: [{ email: toEmail }],
      sender: {
        name: "DevConnect",
        email: "officialthakur94@gmail.com",
      },
      subject: "Reset Your DevConnect Password",
      htmlContent: renderTemplate("forgot-password", {
        ctaText: "Reset Password",
        ctaLink: resetLink,
      }),
    });
  } catch (error) {
    logger.error("Failed to send password reset email", error);
    throw new Error("Email send failed.");
  }
};

export const sendWelcomeEmail = async (toEmail, firstName) => {
  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications["api-key"].apiKey = config.email.brevoApiKey;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    await emailApi.sendTransacEmail({
      to: [{ email: toEmail }],
      sender: {
        name: "DevConnect",
        email: "officialthakur94@gmail.com",
      },
      subject: "Welcome to DevConnect! 🎉",
      htmlContent: renderTemplate("welcome", {
        firstName,
        ctaText: "Explore Now",
        ctaLink: APP_URL,
      }),
    });
  } catch (error) {
    logger.warn("Failed to send welcome email", error);
  }
};

export default {
  sendOtpEmail,
  sendForgotPasswordEmail,
  sendWelcomeEmail,
};
