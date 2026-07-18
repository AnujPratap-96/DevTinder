import SibApiV3Sdk from "sib-api-v3-sdk";

import {
  otpEmailTemplate,
  forgotPasswordTemplate,
  welcomeEmailTemplate,
} from "./emailTemplates/templates.js";
import config from "../config/env.js";
import logger from "./logger.js";

export const sendOtpEmail = async (toEmail, otp, purpose = "signup") => {
  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications["api-key"].apiKey = config.email.brevoApiKey;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const purposeMap = {
      signup: { subject: "Your DevTinder Verification OTP" },
      login: { subject: "Your DevTinder Login OTP" },
      "reset-password": { subject: "Your DevTinder Password Reset OTP" },
    };

    const template = purposeMap[purpose] || purposeMap.signup;

    await emailApi.sendTransacEmail({
      to: [{ email: toEmail }],
      sender: {
        name: "DevTinder",
        email: "officialthakur94@gmail.com",
      },
      subject: template.subject,
      htmlContent: otpEmailTemplate({ otp, purpose }),
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
        name: "DevTinder",
        email: "officialthakur94@gmail.com",
      },
      subject: "Reset Your DevTinder Password",
      htmlContent: forgotPasswordTemplate({ resetLink }),
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
        name: "DevTinder",
        email: "officialthakur94@gmail.com",
      },
      subject: "Welcome to DevTinder! 🎉",
      htmlContent: welcomeEmailTemplate({ firstName }),
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
