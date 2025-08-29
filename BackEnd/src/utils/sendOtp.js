const SibApiV3Sdk = require('sib-api-v3-sdk') ;

 sendOtpEmail = async (toEmail ,otp) => {
  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

    const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const emailPayload = {
      to: [{ email: toEmail }],
      sender: {
        name: 'DevTinder',
        email: 'no-reply@devs-tinder.site',
      },
      subject: 'Your OTP Code',
      htmlContent: `<p>Your OTP is <strong>${otp}</strong></p>`,
    };

    await emailApi.sendTransacEmail(emailPayload);
   
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw new Error("Email send failed.");
  }
};
module.exports = sendOtpEmail;