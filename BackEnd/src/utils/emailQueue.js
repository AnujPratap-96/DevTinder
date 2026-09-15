import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import config from '../config/env.js';
import logger from './logger.js';
import SibApiV3Sdk from "sib-api-v3-sdk";
import renderTemplate from "./emailTemplates/renderTemplate.js";
import { APP_URL } from "./emailTemplates/constants.js";

// Setup Redis connection for BullMQ
const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue('devconnect-emails', { connection });

// Initialize Brevo API
const getEmailApi = () => {
  const client = SibApiV3Sdk.ApiClient.instance;
  client.authentications["api-key"].apiKey = config.email.brevoApiKey;
  return new SibApiV3Sdk.TransactionalEmailsApi();
};

const purposeIntro = {
  signup: "Your account verification code is below. This code will expire in 5 minutes.",
  login: "Your login verification code is below. This code will expire in 5 minutes.",
  "reset-password": "Your password reset code is below. This code will expire in 5 minutes.",
};

const emailWorker = new Worker('devconnect-emails', async (job) => {
  const { type, payload } = job.data;
  const emailApi = getEmailApi();

  try {
    switch (type) {
      case 'RAW_EMAIL': {
        await emailApi.sendTransacEmail({
          to: [{ email: payload.toEmailId }],
          sender: { name: "DevConnect", email: "officialthakur94@gmail.com" },
          subject: payload.subject,
          htmlContent: payload.body,
          textContent: "This is the text format email",
        });
        break;
      }
      
      case 'OTP_EMAIL': {
        const purposeMap = {
          signup: { subject: "Your DevConnect Verification OTP" },
          login: { subject: "Your DevConnect Login OTP" },
          "reset-password": { subject: "Your DevConnect Password Reset OTP" },
        };
        const template = purposeMap[payload.purpose] || purposeMap.signup;
        
        await emailApi.sendTransacEmail({
          to: [{ email: payload.toEmail }],
          sender: { name: "DevConnect", email: "officialthakur94@gmail.com" },
          subject: template.subject,
          htmlContent: renderTemplate("otp", {
            intro: purposeIntro[payload.purpose] || purposeIntro.signup,
            otp: payload.otp,
          }),
        });
        break;
      }
      
      case 'FORGOT_PASSWORD': {
        await emailApi.sendTransacEmail({
          to: [{ email: payload.toEmail }],
          sender: { name: "DevConnect", email: "officialthakur94@gmail.com" },
          subject: "Reset Your DevConnect Password",
          htmlContent: renderTemplate("forgot-password", {
            ctaText: "Reset Password",
            ctaLink: payload.resetLink,
          }),
        });
        break;
      }
      
      case 'WELCOME_EMAIL': {
        await emailApi.sendTransacEmail({
          to: [{ email: payload.toEmail }],
          sender: { name: "DevConnect", email: "officialthakur94@gmail.com" },
          subject: "Welcome to DevConnect! 🎉",
          htmlContent: renderTemplate("welcome", {
            firstName: payload.firstName,
            ctaText: "Explore Now",
            ctaLink: APP_URL,
          }),
        });
        break;
      }
      
      default:
        logger.warn(`Unknown email job type: ${type}`);
    }
  } catch (error) {
    logger.error(`[Email Worker] Failed processing job ${job.id}:`, error);
    throw error;
  }
}, { 
  connection,
  skipVersionCheck: true, 
});

emailWorker.on('completed', (job) => {
  logger.info(`Email job ${job.id} of type ${job.data.type} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  logger.error(`Email job ${job.id} of type ${job.data.type} failed`, { error: err.message });
});
