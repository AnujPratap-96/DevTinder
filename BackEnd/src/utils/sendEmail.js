const SibApiV3Sdk = require("sib-api-v3-sdk");

const run = async (subject, body, toEmailId) => {
  try {
    // Init Brevo client
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    // Build payload
    const emailPayload = {
      to: [{ email: toEmailId }],
      sender: {
        name: "DevTinder",
        email: "no-reply@devs-tinder.site",
      },
      subject: subject,
      htmlContent: `<h1>${body}</h1>`, // you can change this if you want
      textContent: "This is the text format email", // fallback for clients that don't render HTML
    };

    // Send email
    const response = await emailApi.sendTransacEmail(emailPayload);
    return response;
  } catch (error) {
  
    throw new Error("Email send failed.");
  }
};

module.exports = { run };
