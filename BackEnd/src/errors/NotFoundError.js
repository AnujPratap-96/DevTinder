import AppError from "./AppError.js";

class NotFoundError extends AppError {
  constructor(resource = "Resource", query) {
    super({
      message: `${resource} not found`,
      statusCode: 404,
      errorCode: "NOT_FOUND",
      details: query,
    });
  }
}

export default NotFoundError;
