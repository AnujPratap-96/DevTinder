import jwt from "jsonwebtoken";

import config from "../config/env.js";
import { AppError } from "../errors/index.js";

export const generateSignJWT = async (emailId) => {
  const secret = config.signupJwt.secret || config.jwt.secret;
  if (!secret) {
    throw new Error("Signup JWT secret is not configured");
  }
  return jwt.sign({ emailId }, secret, {
    expiresIn: config.signupJwt.expiresIn || "1h",
  });
};

export const verifySignJWT = async (req, res, next) => {
  const token = req.cookies.signup_token;
  if (!token) {
    return next(new AppError({ message: "Unauthorized", statusCode: 401 }));
  }
  try {
    const decoded = await jwt.verify(
      token,
      config.signupJwt.secret || config.jwt.secret
    );
    req.emailId = decoded.emailId;
    next();
  } catch (error) {
    next(new AppError({ message: "Unauthorized", statusCode: 401, details: error.message }));
  }
};

export default {
  generateSignJWT,
  verifySignJWT,
};
