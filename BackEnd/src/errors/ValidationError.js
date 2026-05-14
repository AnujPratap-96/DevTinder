import AppError from "./AppError.js";

class ValidationError extends AppError {
  constructor(message, details) {
    super({
      message: message || "Validation failed",
      statusCode: 400,
      errorCode: "VALIDATION_ERROR",
      details,
    });
  }
}

export default ValidationError;
