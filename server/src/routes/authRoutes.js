/**
 * @module routes/authRoutes
 * @description Authentication routes for OTP, register, login, profile, and token refresh.
 */

import { Router } from 'express';
import { sendOtp, register, login, getMe, refreshToken, googleLogin } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * POST /api/auth/google
 * Authenticates a user using a Google ID token.
 */
router.post('/google', authLimiter, googleLogin);

/**
 * POST /api/auth/send-otp
 * Validates registration data and sends a 6-digit OTP to the user's email.
 * Rate limited by authLimiter.
 */
router.post('/send-otp', authLimiter, sendOtp);

/**
 * POST /api/auth/register
 * Verifies the OTP and creates the user account.
 * Rate limited by authLimiter.
 */
router.post('/register', authLimiter, register);

/**
 * POST /api/auth/login
 * Authenticates a user and returns access + refresh tokens.
 * Rate limited by authLimiter.
 */
router.post('/login', authLimiter, login);

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 * Requires JWT authentication.
 */
router.get('/me', authenticate, getMe);

/**
 * POST /api/auth/refresh
 * Refreshes an expired access token using a valid refresh token.
 * Rate limited by authLimiter.
 */
router.post('/refresh', authLimiter, refreshToken);

router.get('/debug/users', async (req, res) => {
  try {
    const { query } = await import('../config/database.js');
    const result = await query('SELECT id, username, email, elo_rating, created_at FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
