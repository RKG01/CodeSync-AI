/**
 * @module middleware/errorHandler
 * @description Global error handling middleware for Express.
 */

import env from '../config/env.js';

/**
 * Custom application error class with HTTP status code support.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message.
   * @param {number} statusCode - HTTP status code.
   * @param {string} [code] - Optional application-specific error code.
   */
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware.
 * Catches all errors passed via next(err) and returns a consistent JSON response.
 *
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} _next - Express next function (unused but required for Express signature).
 * @returns {void}
 */
export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'A resource with that value already exists.';
    code = 'DUPLICATE_ENTRY';
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced resource does not exist.';
    code = 'FOREIGN_KEY_VIOLATION';
  } else if (err.type === 'entity.parse.failed') {
    // JSON body parse error
    statusCode = 400;
    message = 'Invalid JSON in request body.';
    code = 'INVALID_JSON';
  }

  // Log server errors
  if (statusCode >= 500) {
    console.error('🔥 Server error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  const response = {
    success: false,
    error: message,
    code,
  };

  // Include stack trace in development
  if (env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Middleware for handling 404 — route not found.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {void}
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found.`,
    code: 'NOT_FOUND',
  });
}
