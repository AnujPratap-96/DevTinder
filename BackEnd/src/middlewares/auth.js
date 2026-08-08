import jwt from "jsonwebtoken";

import config from "../config/env.js";
import { findUserById } from "../repositories/user.repository.js";
import { AppError } from "../errors/index.js";

export const userAuth = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return next(
      new AppError({
        message: "Authentication token missing",
        statusCode: 401,
        errorCode: "AUTH_TOKEN_MISSING",
      })
    );
  }

  try {
    const decode = await jwt.verify(token, config.jwt.secret);
    const user = await findUserById(decode._id);
    if (!user) {
      throw new AppError({
        message: "User not found",
        statusCode: 401,
        errorCode: "AUTH_USER_NOT_FOUND",
      });
    }

    // Apply plan expiry in-memory: an expired paid plan reverts to "free"
    // for the lifetime of this request. A cron job persists the revert.
    if (
      user.membershipType &&
      user.membershipType !== "free" &&
      user.membershipExpiresAt &&
      user.membershipExpiresAt < new Date()
    ) {
      user.membershipType = "free";
      user.isPremium = false;
    }

    req.user = user;
    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError({
            message: "Authentication failed",
            statusCode: 401,
            errorCode: "AUTH_FAILED",
            details: error.message,
          })
    );
  }
};

export default userAuth;
