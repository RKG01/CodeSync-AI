/**
 * @module routes/duelRoutes
 * @description Routes for duel history, leaderboard, and user profiles.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getDuelHistory,
  getDuelDetails,
  getLeaderboard,
  getUserProfile,
  getMyStats,
} from '../controllers/duelController.js';

const router = Router();

// All duel routes require authentication
router.use(authenticate);

/**
 * GET /api/duels/my-stats
 * Returns current user's competitive stats.
 */
router.get('/my-stats', getMyStats);

/**
 * GET /api/duels/history
 * Returns the authenticated user's duel history.
 */
router.get('/history', getDuelHistory);

/**
 * GET /api/duels/:duelId
 * Returns details of a specific duel.
 */
router.get('/:duelId', getDuelDetails);

export default router;
