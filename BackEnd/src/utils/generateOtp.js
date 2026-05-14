import crypto from "crypto";
const generateOtp = (length = 6) => {
 const otp = crypto.randomInt(10**(length-1), 10**length).toString();
 const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
 return { otp, otpHash }; 
};

export default generateOtp;

