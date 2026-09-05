const config = require('../config/env');
const { ZodError } = require('zod');

/**
 * Middleware to handle 404 Not Found errors
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
};

/**
 * Global centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Determine status code
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected internal error occurred';
  let details = err.details || null;

  // Handle Zod validation errors gracefully
  if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // Handle Prisma known request errors (e.g., unique constraint violation)
  if (err.code === 'P2002') {
    statusCode = 409;
    code = 'UNIQUE_CONSTRAINT_VIOLATION';
    message = `A record with this ${err.meta?.target ? err.meta.target.join(', ') : 'field'} already exists`;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    code = 'RECORD_NOT_FOUND';
    message = 'The requested database record was not found';
  }

  // Only log stack traces in development or on real 500 errors
  if (config.NODE_ENV === 'development' || statusCode === 500) {
    console.error(`[ERROR] [${req.method} ${req.originalUrl}] - Status: ${statusCode} - ${message}`);
    if (err.stack) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = {
  notFound,
  errorHandler,
};
