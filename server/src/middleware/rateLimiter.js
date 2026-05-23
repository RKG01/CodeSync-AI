/**
 * @module middleware/rateLimiter
 * @description Rate limiting configurations for different route groups.
 */

import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter.
 * Allows 500 requests per 15-minute window per IP.
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 500 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes',
  },
});

/**
 * Auth route rate limiter.
 * Allows 100 requests per 15-minute window per IP.
 * Stricter to prevent brute-force login/register attempts.
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    retryAfter: '15 minutes',
  },
});

/**
 * AI route rate limiter.
 * Allows 60 requests per 1-minute window per IP.
 * Prevents excessive AI API usage.
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
export const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 60 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AI request limit exceeded. Please wait before trying again.',
    retryAfter: '1 minute',
  },
});
