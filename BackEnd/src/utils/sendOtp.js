const SibApiV3Sdk = require('sib-api-v3-sdk');
const { otpEmailTemplate, forgotPasswordTemplate } = require("./emailTemplates/templates");

const sendOtpEmail = async (toEmail, otp, purpose = "signup") => {
  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const purposeMap = {
      signup: { subject: "Your DevTinder Verification OTP" },
      login: { subject: "Your DevTinder Login OTP" },
      "reset-password": { subject: "Your DevTinder Password Reset OTP" },
    };
    
    const config = purposeMap[purpose] || purposeMap.signup;

    const htmlContent = otpEmailTemplate({ otp, purpose });

    const emailPayload = {
      to: [{ email: toEmail }],
      sender: {
        name: 'DevTinder',
        email: 'no-reply@devs-tinder.site',
      },
      subject: config.subject,
      htmlContent,
    };

    await emailApi.sendTransacEmail(emailPayload);
    
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw new Error("Email send failed.");
  }
};

const sendForgotPasswordEmail = async (toEmail, resetLink) => {
  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const htmlContent = forgotPasswordTemplate({ resetLink });

    const emailPayload = {
      to: [{ email: toEmail }],
      sender: {
        name: 'DevTinder',
        email: 'no-reply@devs-tinder.site',
      },
      subject: "Reset Your DevTinder Password",
      htmlContent,
    };

    await emailApi.sendTransacEmail(emailPayload);
    
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw new Error("Email send failed.");
  }
};

const sendWelcomeEmail = async (toEmail, firstName) => {
  const { welcomeEmailTemplate } = require("./emailTemplates/templates");
  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();
    const htmlContent = welcomeEmailTemplate({ firstName });

    const emailPayload = {
      to: [{ email: toEmail }],
      sender: {
        name: 'DevTinder',
        email: 'no-reply@devs-tinder.site',
      },
      subject: "Welcome to DevTinder! 🎉",
      htmlContent,
    };

    await emailApi.sendTransacEmail(emailPayload);
    
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error);
  }
};

module.exports = {
  sendOtpEmail,
  sendForgotPasswordEmail,
  sendWelcomeEmail,
};