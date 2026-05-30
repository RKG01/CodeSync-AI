/**
 * @module controllers/duelController
 * @description Handles REST API requests for duel history, leaderboard, and user profiles.
 */

import User from '../models/User.js';
import Duel from '../models/Duel.js';
import { getRank, getAllRanks } from '../services/eloService.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * GET /api/duels/history
 * Returns the authenticated user's duel history.
 */
export async function getDuelHistory(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const duels = await Duel.getHistory(req.user.id, limit);

    const enriched = duels.map((d) => ({
      ...d,
      isWinner: d.winner_id === req.user.id,
      eloChange:
        d.player1_id === req.user.id ? d.elo_change_p1 : d.elo_change_p2,
    }));

    res.json({
      success: true,
      data: { duels: enriched },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/duels/:duelId
 * Returns details of a specific duel.
 */
export async function getDuelDetails(req, res, next) {
  try {
    const duel = await Duel.findById(req.params.duelId);
    if (!duel) {
      throw new AppError('Duel not found.', 404, 'DUEL_NOT_FOUND');
    }

    // Get submissions for this duel
    const submissions = await Duel.getSubmissions(duel.id);

    res.json({
      success: true,
      data: {
        duel,
        submissions,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/leaderboard
 * Returns the top players by Elo rating.
 */
export async function getLeaderboard(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const players = await User.getLeaderboard(limit);

    const enriched = players.map((p, index) => ({
      rank: index + 1,
      ...p,
      tier: getRank(p.elo_rating),
      winRate:
        p.matches_played > 0
          ? Math.round((p.matches_won / p.matches_played) * 100)
          : 0,
    }));

    res.json({
      success: true,
      data: {
        players: enriched,
        ranks: getAllRanks(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/profile/:userId
 * Returns a user's public profile with duel stats.
 */
export async function getUserProfile(req, res, next) {
  try {
    const profile = await User.getProfile(req.params.userId);
    if (!profile) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const recentDuels = await Duel.getHistory(profile.id, 10);
    const tier = getRank(profile.elo_rating);

    res.json({
      success: true,
      data: {
        profile: {
          ...profile,
          tier,
          winRate:
            profile.matches_played > 0
              ? Math.round(
                  (profile.matches_won / profile.matches_played) * 100
                )
              : 0,
        },
        recentDuels,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/duels/my-stats
 * Returns the authenticated user's competitive stats.
 */
export async function getMyStats(req, res, next) {
  try {
    const profile = await User.getProfile(req.user.id);
    if (!profile) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const tier = getRank(profile.elo_rating);

    res.json({
      success: true,
      data: {
        elo: profile.elo_rating,
        tier,
        matchesPlayed: profile.matches_played,
        matchesWon: profile.matches_won,
        winRate:
          profile.matches_played > 0
            ? Math.round(
                (profile.matches_won / profile.matches_played) * 100
              )
            : 0,
      },
    });
  } catch (error) {
    next(error);
  }
}
