import Razorpay from "razorpay";

import config from "../config/env.js";

const razorpayInstance = new Razorpay({
  key_id: config.payment.razorpayKeyId,
  key_secret: config.payment.razorpayKeySecret,
});

export default razorpayInstance;
