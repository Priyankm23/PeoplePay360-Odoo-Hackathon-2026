/**
 * Standard API Response Envelope
 */
class ApiResponse {
  constructor(statusCode = 200, data = null, message = 'Success') {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }

  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created(res, data = null, message = 'Resource created successfully') {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }
}

/**
 * Standard Operational API Error class
 */
class ApiError extends Error {
  constructor(statusCode = 500, message = 'An unexpected error occurred', details = null, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details = null, code = 'BAD_REQUEST') {
    return new ApiError(400, message, details, code);
  }

  static unauthorized(message = 'Unauthorized access', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, null, code);
  }

  static forbidden(message = 'Access forbidden', code = 'FORBIDDEN') {
    return new ApiError(403, message, null, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, message, null, code);
  }

  static conflict(message = 'Resource conflict', details = null, code = 'CONFLICT') {
    return new ApiError(409, message, details, code);
  }

  static internal(message = 'Internal server error', details = null, code = 'INTERNAL_SERVER_ERROR') {
    return new ApiError(500, message, details, code);
  }
}

module.exports = {
  ApiResponse,
  ApiError,
};
