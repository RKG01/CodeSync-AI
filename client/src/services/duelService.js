/**
 * @module services/duelService
 * @description Client-side API service for duel-related REST endpoints.
 */

import api from './api.js';

/**
 * Gets the current user's competitive stats.
 * @returns {Promise<Object>} Stats object with elo, tier, matchesPlayed, etc.
 */
export async function getMyStats() {
  const response = await api.get('/duels/my-stats');
  return response.data;
}

/**
 * Gets the current user's duel history.
 * @param {number} [limit=20] - Max results.
 * @returns {Promise<Array>} Array of duel records.
 */
export async function getDuelHistory(limit = 20) {
  const response = await api.get(`/duels/history?limit=${limit}`);
  return response.data.duels;
}

/**
 * Gets details of a specific duel.
 * @param {string} duelId - The duel UUID.
 * @returns {Promise<Object>} Duel details with submissions.
 */
export async function getDuelDetails(duelId) {
  const response = await api.get(`/duels/${duelId}`);
  return response.data;
}

/**
 * Gets the leaderboard.
 * @param {number} [limit=50] - Max results.
 * @returns {Promise<Object>} Players array and ranks info.
 */
export async function getLeaderboard(limit = 50) {
  const response = await api.get(`/leaderboard?limit=${limit}`);
  return response.data;
}

/**
 * Gets a user's public profile.
 * @param {string} userId - The user UUID.
 * @returns {Promise<Object>} Profile and recent duels.
 */
export async function getUserProfile(userId) {
  const response = await api.get(`/profile/${userId}`);
  return response.data;
}

export default { getMyStats, getDuelHistory, getDuelDetails, getLeaderboard, getUserProfile };
