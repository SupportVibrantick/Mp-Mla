export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: any;

  constructor(
    statusCode: number,
    message: string,
    errors?: any,
    stack?: string,
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = "Bad request", errors?: any) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Unauthorized", errors?: any) {
    return new ApiError(401, message, errors);
  }

  static forbidden(message = "Forbidden", errors?: any) {
    return new ApiError(403, message, errors);
  }

  static notFound(message = "Not found", errors?: any) {
    return new ApiError(404, message, errors);
  }

  static conflict(message = "Conflict", errors?: any) {
    return new ApiError(409, message, errors);
  }

  static internal(message = "Internal server error", errors?: any) {
    return new ApiError(500, message, errors);
  }
}
