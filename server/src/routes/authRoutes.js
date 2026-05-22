/**
 * @module routes/authRoutes
 * @description Authentication routes for register, login, profile, and token refresh.
 */

import { Router } from 'express';
import { register, login, getMe, refreshToken } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

/**
 * POST /api/auth/register
 * Registers a new user account.
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

export default router;
