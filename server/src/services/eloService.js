/**
 * @module services/eloService
 * @description Implements the Elo rating algorithm and rank tier system
 * for competitive coding duels.
 */

/**
 * Rank tier definitions ordered by Elo thresholds.
 */
const RANK_TIERS = [
  { name: 'Grandmaster', badge: '👑', minElo: 1800, color: '#ff4500' },
  { name: 'Diamond',     badge: '💠', minElo: 1600, color: '#b9f2ff' },
  { name: 'Platinum',    badge: '💎', minElo: 1400, color: '#00e5ff' },
  { name: 'Gold',        badge: '🥇', minElo: 1200, color: '#ffd700' },
  { name: 'Silver',      badge: '🥈', minElo: 1000, color: '#c0c0c0' },
  { name: 'Bronze',      badge: '🥉', minElo: 0,    color: '#cd7f32' },
];

/**
 * Calculates the expected score (win probability) for player A.
 * @param {number} eloA - Player A's Elo rating.
 * @param {number} eloB - Player B's Elo rating.
 * @returns {number} Expected score between 0 and 1.
 */
function expectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Calculates the Elo change for both players after a match.
 * @param {number} winnerElo - Winner's current Elo.
 * @param {number} loserElo - Loser's current Elo.
 * @param {number} [kFactor=32] - The K-factor (sensitivity). Higher = more volatile.
 * @returns {{ winnerDelta: number, loserDelta: number, winnerNewElo: number, loserNewElo: number }}
 */
export function calculateEloChange(winnerElo, loserElo, kFactor = 32) {
  const winnerExpected = expectedScore(winnerElo, loserElo);
  const loserExpected = expectedScore(loserElo, winnerElo);

  // Winner scored 1, loser scored 0
  const winnerDelta = Math.round(kFactor * (1 - winnerExpected));
  const loserDelta = Math.round(kFactor * (0 - loserExpected));

  return {
    winnerDelta,
    loserDelta,
    winnerNewElo: Math.max(0, winnerElo + winnerDelta),
    loserNewElo: Math.max(0, loserElo + loserDelta),
  };
}

/**
 * Calculates Elo changes for a draw.
 * @param {number} eloA - Player A's Elo.
 * @param {number} eloB - Player B's Elo.
 * @param {number} [kFactor=32] - K-factor.
 * @returns {{ deltaA: number, deltaB: number, newEloA: number, newEloB: number }}
 */
export function calculateDrawElo(eloA, eloB, kFactor = 32) {
  const expectedA = expectedScore(eloA, eloB);
  const expectedB = expectedScore(eloB, eloA);

  const deltaA = Math.round(kFactor * (0.5 - expectedA));
  const deltaB = Math.round(kFactor * (0.5 - expectedB));

  return {
    deltaA,
    deltaB,
    newEloA: Math.max(0, eloA + deltaA),
    newEloB: Math.max(0, eloB + deltaB),
  };
}

/**
 * Gets the rank tier for a given Elo rating.
 * @param {number} elo - The Elo rating.
 * @returns {{ name: string, badge: string, minElo: number, color: string }}
 */
export function getRank(elo) {
  for (const tier of RANK_TIERS) {
    if (elo >= tier.minElo) {
      return tier;
    }
  }
  return RANK_TIERS[RANK_TIERS.length - 1];
}

/**
 * Returns all rank tiers for display purposes.
 * @returns {Array<{ name: string, badge: string, minElo: number, color: string }>}
 */
export function getAllRanks() {
  return [...RANK_TIERS].reverse();
}

export default { calculateEloChange, calculateDrawElo, getRank, getAllRanks };
