/**
 * @module models/Duel
 * @description Duel model with static methods for creating, managing, and
 * querying competitive coding duels between users.
 */

import { query, isMemoryMode } from '../config/database.js';

let memTables = null;
async function getTables() {
  if (!memTables) {
    const mod = await import('../config/memoryDb.js');
    memTables = mod.tables;
  }
  return memTables;
}

/**
 * Duel model class providing static methods for duel data operations.
 */
class Duel {
  /**
   * Creates a new duel record.
   * @param {Object} data - Duel creation data.
   * @param {string} data.player1Id - Player 1 UUID.
   * @param {string} data.player2Id - Player 2 UUID.
   * @param {string} data.language - Programming language.
   * @param {string} data.difficulty - Difficulty level (easy/medium/hard).
   * @param {string} data.problemTitle - The challenge title.
   * @param {string} data.problemDescription - The challenge description.
   * @param {Array} data.testCases - Array of {input, expectedOutput}.
   * @param {number} [data.durationSeconds=900] - Time limit in seconds.
   * @returns {Promise<Object>} The created duel record.
   */
  static async create({
    id,
    player1Id,
    player2Id,
    mode = '1q',
    status = 'active',
    problems = []
  }) {
    const result = await query(
      `INSERT INTO duels (id, player1_id, player2_id, mode, status, problems)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        player1Id,
        player2Id,
        mode,
        status,
        JSON.stringify(problems)
      ]
    );

    return result.rows[0];
  }

  /**
   * Finds a duel by its ID, including player info.
   * @param {string} duelId - The duel UUID.
   * @returns {Promise<Object|null>} The duel with player details or null.
   */
  static async findById(duelId) {
    if (isMemoryMode()) {
      const tables = await getTables();
      const duel = tables.duels.find((d) => d.id === duelId);
      if (!duel) return null;

      const p1 = tables.users.find((u) => u.id === duel.player1_id);
      const p2 = tables.users.find((u) => u.id === duel.player2_id);
      const winner = duel.winner_id
        ? tables.users.find((u) => u.id === duel.winner_id)
        : null;

      return {
        ...duel,
        test_cases:
          typeof duel.test_cases === 'string'
            ? JSON.parse(duel.test_cases)
            : duel.test_cases,
        player1_username: p1?.username || 'unknown',
        player1_elo: p1?.elo_rating || 1000,
        player2_username: p2?.username || 'unknown',
        player2_elo: p2?.elo_rating || 1000,
        winner_username: winner?.username || null,
      };
    }

    const result = await query(
      `SELECT d.*,
              u1.username AS player1_username, u1.elo_rating AS player1_elo,
              u2.username AS player2_username, u2.elo_rating AS player2_elo,
              uw.username AS winner_username
       FROM duels d
       JOIN users u1 ON d.player1_id = u1.id
       JOIN users u2 ON d.player2_id = u2.id
       LEFT JOIN users uw ON d.winner_id = uw.id
       WHERE d.id = $1`,
      [duelId]
    );

    return result.rows[0] || null;
  }

  /**
   * Updates a duel's status.
   * @param {string} duelId - The duel UUID.
   * @param {string} status - New status (waiting/active/completed/cancelled).
   * @returns {Promise<Object|null>} The updated duel.
   */
  static async updateStatus(duelId, status) {
    const extra =
      status === 'active'
        ? ', started_at = NOW()'
        : status === 'completed' || status === 'cancelled'
          ? ', ended_at = NOW()'
          : '';

    const result = await query(
      `UPDATE duels SET status = $1${extra} WHERE id = $2 RETURNING *`,
      [status, duelId]
    );

    return result.rows[0] || null;
  }

  /**
   * Completes a duel with results.
   * @param {string} duelId - The duel UUID.
   * @param {string|null} winnerId - Winner's UUID (null for draw).
   * @param {number} eloChangeP1 - Elo delta for player 1.
   * @param {number} eloChangeP2 - Elo delta for player 2.
   * @returns {Promise<Object|null>} The completed duel.
   */
  static async complete(duelId, winnerId, eloChangeP1, eloChangeP2) {
    const result = await query(
      `UPDATE duels
       SET status = $1, winner_id = $2, elo_change_p1 = $3, elo_change_p2 = $4, ended_at = NOW()
       WHERE id = $5
       RETURNING *`,
      ['completed', winnerId, eloChangeP1, eloChangeP2, duelId]
    );

    return result.rows[0] || null;
  }

  /**
   * Records a code submission for a duel.
   * @param {Object} data - Submission data.
   * @returns {Promise<Object>} The stored submission.
   */
  static async submitSolution({
    duelId,
    userId,
    code,
    testsPassed,
    totalTests,
    executionTimeMs,
    stdout,
    stderr,
  }) {
    const result = await query(
      `INSERT INTO duel_submissions (duel_id, user_id, code, tests_passed, total_tests, execution_time_ms, stdout, stderr)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [duelId, userId, code, testsPassed, totalTests, executionTimeMs, stdout, stderr]
    );

    return result.rows[0];
  }

  /**
   * Gets all submissions for a duel.
   * @param {string} duelId - The duel UUID.
   * @returns {Promise<Array<Object>>} Array of submissions with user info.
   */
  static async getSubmissions(duelId) {
    if (isMemoryMode()) {
      const tables = await getTables();
      return tables.duel_submissions
        .filter((s) => s.duel_id === duelId)
        .map((s) => {
          const user = tables.users.find((u) => u.id === s.user_id);
          return { ...s, username: user?.username || 'unknown' };
        })
        .sort(
          (a, b) => new Date(a.submitted_at || a.created_at) - new Date(b.submitted_at || b.created_at)
        );
    }

    const result = await query(
      `SELECT ds.*, u.username
       FROM duel_submissions ds
       JOIN users u ON ds.user_id = u.id
       WHERE ds.duel_id = $1
       ORDER BY ds.submitted_at ASC`,
      [duelId]
    );

    return result.rows;
  }

  /**
   * Gets a user's duel history.
   * @param {string} userId - The user UUID.
   * @param {number} [limit=20] - Maximum number of duels to return.
   * @returns {Promise<Array<Object>>} Array of duel records.
   */
  static async getHistory(userId, limit = 20) {
    if (isMemoryMode()) {
      const tables = await getTables();
      return tables.duels
        .filter(
          (d) =>
            (d.player1_id === userId || d.player2_id === userId) &&
            d.status === 'completed'
        )
        .sort(
          (a, b) => new Date(b.ended_at || b.created_at) - new Date(a.ended_at || a.created_at)
        )
        .slice(0, limit)
        .map((d) => {
          const p1 = tables.users.find((u) => u.id === d.player1_id);
          const p2 = tables.users.find((u) => u.id === d.player2_id);
          return {
            ...d,
            player1_username: p1?.username || 'unknown',
            player2_username: p2?.username || 'unknown',
          };
        });
    }

    const result = await query(
      `SELECT d.*,
              u1.username AS player1_username,
              u2.username AS player2_username
       FROM duels d
       JOIN users u1 ON d.player1_id = u1.id
       JOIN users u2 ON d.player2_id = u2.id
       WHERE (d.player1_id = $1 OR d.player2_id = $1)
         AND d.status = 'completed'
       ORDER BY d.ended_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }
}

export default Duel;
