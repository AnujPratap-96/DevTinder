import SibApiV3Sdk from "sib-api-v3-sdk";

import config from "../config/env.js";
import logger from "./logger.js";

const run = async (subject, body, toEmailId) => {
  const client = SibApiV3Sdk.ApiClient.instance;
  client.authentications["api-key"].apiKey = config.email.brevoApiKey;

  const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

  const emailPayload = {
    to: [{ email: toEmailId }],
    sender: {
      name: "DevTinder",
      email: "officialthakur94@gmail.com",
    },
    subject,
    htmlContent: body,
    textContent: "This is the text format email",
  };

  try {
    return await emailApi.sendTransacEmail(emailPayload);
  } catch (error) {
    logger.error("Email send failed", { to: toEmailId, subject });
    throw new Error(`Email send failed: ${error?.message || "unknown error"}`);
  }
};

export { run };
