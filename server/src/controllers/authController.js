/**
 * @module controllers/authController
 * @description Authentication controller handling register (with OTP), login, token refresh, and profile retrieval.
 */

import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendOtpEmail } from '../services/emailService.js';
import crypto from 'crypto';

// ─── In-Memory OTP Store ──────────────────────────────────────────────────────
// In production, use Redis for this. For now, a simple Map with TTL cleanup.
const otpStore = new Map();

// Cleanup expired OTPs every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore) {
    if (now > entry.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 60_000);

// ─── Password Validation ──────────────────────────────────────────────────────

/**
 * Validates password strength.
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char.
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter (A-Z)');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter (a-z)');
  if (!/[0-9]/.test(password)) errors.push('At least one digit (0-9)');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) errors.push('At least one special character (!@#$%^&*...)');
  return { valid: errors.length === 0, errors };
}

// ─── Send OTP ─────────────────────────────────────────────────────────────────

/**
 * Sends an OTP to the user's email for verification before registration.
 * Validates all registration fields first, then sends the OTP.
 * @param {import('express').Request} req - Request with { username, email, password } in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function sendOtp(req, res, next) {
  try {
    const { username, email, password } = req.body;

    // Validate input presence
    if (!username || !email || !password) {
      throw new AppError('Username, email, and password are required.', 400, 'VALIDATION_ERROR');
    }

    // Validate username
    if (username.length < 3 || username.length > 30) {
      throw new AppError('Username must be between 3 and 30 characters.', 400, 'VALIDATION_ERROR');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      throw new AppError('Username may only contain letters, numbers, underscores, and hyphens.', 400, 'VALIDATION_ERROR');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format.', 400, 'VALIDATION_ERROR');
    }

    // Validate password strength
    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      throw new AppError(
        `Password too weak. Missing: ${pwResult.errors.join(', ')}`,
        400,
        'WEAK_PASSWORD'
      );
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

    // Rate-limit OTP sends per email (max 1 per 60 seconds)
    const existingOtp = otpStore.get(email);
    if (existingOtp && Date.now() - existingOtp.createdAt < 60_000) {
      const waitSec = Math.ceil((60_000 - (Date.now() - existingOtp.createdAt)) / 1000);
      throw new AppError(
        `Please wait ${waitSec} seconds before requesting a new OTP.`,
        429,
        'OTP_RATE_LIMIT'
      );
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store OTP with 5-minute expiration
    otpStore.set(email, {
      otp,
      username,
      password, // We store the raw password temporarily — it gets hashed on registration
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    });

    // Send the email
    const emailResult = await sendOtpEmail(email, otp, username);

    res.json({
      success: true,
      message: 'Verification code sent to your email.',
      // In development, include preview URL for Ethereal
      ...(emailResult.previewUrl ? { previewUrl: emailResult.previewUrl } : {}),
    });
  } catch (error) {
    next(error);
  }
}

// ─── Register (with OTP verification) ─────────────────────────────────────────

/**
 * Registers a new user account after verifying the OTP.
 * @param {import('express').Request} req - Request with { email, otp } in body.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 */
export async function register(req, res, next) {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      throw new AppError('Email and verification code are required.', 400, 'VALIDATION_ERROR');
    }

    // Find the stored OTP entry
    const entry = otpStore.get(email);
    if (!entry) {
      throw new AppError('No verification code found. Please request a new one.', 400, 'OTP_NOT_FOUND');
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(email);
      throw new AppError('Verification code has expired. Please request a new one.', 400, 'OTP_EXPIRED');
    }

    // Check max attempts (5)
    if (entry.attempts >= 5) {
      otpStore.delete(email);
      throw new AppError('Too many invalid attempts. Please request a new code.', 429, 'OTP_MAX_ATTEMPTS');
    }

    // Verify OTP
    if (entry.otp !== otp.toString().trim()) {
      entry.attempts++;
      throw new AppError(
        `Invalid verification code. ${5 - entry.attempts} attempt(s) remaining.`,
        400,
        'OTP_INVALID'
      );
    }

    // OTP is valid — create the user
    const { username, password } = entry;

    // Double-check no one registered in the meantime
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      otpStore.delete(email);
      throw new AppError('Email was already registered.', 409, 'DUPLICATE_EMAIL');
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      otpStore.delete(email);
      throw new AppError('Username was already taken.', 409, 'DUPLICATE_USERNAME');
    }

    // Create user
    const user = await User.create(username, email, password);

    // Clear the OTP
    otpStore.delete(email);

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

// ─── Login ────────────────────────────────────────────────────────────────────

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
