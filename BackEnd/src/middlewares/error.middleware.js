import httpStatus from "http-status";

import { AppError } from "../errors/index.js";
import config from "../config/env.js";
import logger from "../utils/logger.js";

export const errorConverter = (err, req, res, next) => {
  if (err instanceof AppError) {
    return next(err);
  }

  const statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  const message = err.message || httpStatus[statusCode] || "Internal Server Error";

  return next(
    new AppError({
      message,
      statusCode,
      errorCode: err.name || "INTERNAL_SERVER_ERROR",
      details: err.details || err.errors,
    })
  );
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  const response = {
    success: false,
    message: err.message || httpStatus[statusCode] || "Internal Server Error",
    error: err.errorCode || err.name || "INTERNAL_SERVER_ERROR",
  };

  if (err.details) {
    response.details = err.details;
  }

  if (!config.isProduction) {
    response.stack = err.stack;
  }

  if (statusCode >= 500) {
    logger.error("Unhandled error", err);
  } else {
    logger.warn("Handled error", err);
  }

  res.status(statusCode).json(response);
};

export default {
  errorConverter,
  errorHandler,
};
