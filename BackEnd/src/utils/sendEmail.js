import SibApiV3Sdk from "sib-api-v3-sdk";

import config from "../config/env.js";

const run = async (subject, body, toEmailId) => {
  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications["api-key"].apiKey = config.email.brevoApiKey;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const emailPayload = {
      to: [{ email: toEmailId }],
      sender: {
        name: "DevTinder",
        email: "no-reply@devs-tinder.site",
      },
      subject,
      htmlContent: body,
      textContent: "This is the text format email",
    };

    return emailApi.sendTransacEmail(emailPayload);
  } catch (error) {
    throw new Error("Email send failed.");
  }
};

export { run };
