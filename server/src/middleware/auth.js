/**
 * @module middleware/auth
 * @description JWT authentication middleware for protecting routes.
 */

import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * JWT authentication middleware.
 * Extracts the token from the Authorization header (Bearer scheme),
 * verifies it, and attaches the decoded user payload to `req.user`.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {void}
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization format. Use: Bearer <token>',
      });
    }

    const token = parts[1];

    const decoded = jwt.verify(token, env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.',
        code: 'TOKEN_INVALID',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed.',
    });
  }
}

/**
 * Generates an access token for a user.
 * @param {Object} user - The user object.
 * @param {string} user.id - User ID.
 * @param {string} user.email - User email.
 * @param {string} user.username - Username.
 * @returns {string} Signed JWT access token.
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

/**
 * Generates a refresh token for a user.
 * @param {Object} user - The user object.
 * @param {string} user.id - User ID.
 * @returns {string} Signed JWT refresh token.
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * Verifies a refresh token and returns the decoded payload.
 * @param {string} token - The refresh token to verify.
 * @returns {Object} Decoded token payload.
 * @throws {Error} If the token is invalid or expired.
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

export default authenticate;
