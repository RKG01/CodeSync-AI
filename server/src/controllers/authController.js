/**
 * @module controllers/authController
 * @description Authentication controller handling register, login, token refresh, and profile retrieval.
 */

import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Registers a new user account.
 * @param {import('express').Request} req - Request with { username, email, password } in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      throw new AppError('Username, email, and password are required.', 400, 'VALIDATION_ERROR');
    }

    if (username.length < 3 || username.length > 30) {
      throw new AppError('Username must be between 3 and 30 characters.', 400, 'VALIDATION_ERROR');
    }

    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long.', 400, 'VALIDATION_ERROR');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format.', 400, 'VALIDATION_ERROR');
    }

    // Check for existing user
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      throw new AppError('Email is already registered.', 409, 'DUPLICATE_EMAIL');
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      throw new AppError('Username is already taken.', 409, 'DUPLICATE_USERNAME');
    }

    // Create user
    const user = await User.create(username, email, password);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Authenticates a user and returns tokens.
 * @param {import('express').Request} req - Request with { email, password } in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required.', 400, 'VALIDATION_ERROR');
    }

    // Find user by email (includes password_hash)
    const user = await User.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValid = await User.comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Update last active
    await User.updateLastActive(user.id);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns the currently authenticated user's profile.
 * @param {import('express').Request} req - Request with user attached by auth middleware.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    await User.updateLastActive(user.id);

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refreshes an access token using a valid refresh token.
 * @param {import('express').Request} req - Request with { refreshToken } in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new AppError('Refresh token is required.', 400, 'VALIDATION_ERROR');
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (error) {
      throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}
