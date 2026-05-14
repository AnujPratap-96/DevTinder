class AppError extends Error {
  constructor({ message, statusCode = 500, errorCode = "INTERNAL_ERROR", details } = {}) {
    super(message || "Unexpected error occurred");
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export default AppError;
