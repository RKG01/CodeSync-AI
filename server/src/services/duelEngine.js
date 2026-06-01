/**
 * @module services/duelEngine
 * @description Manages active coding duels in memory. Handles the lifecycle from
 * problem generation → countdown → active coding → submission → scoring → completion.
 */

import { v4 as uuidv4 } from 'uuid';
import Duel from '../models/Duel.js';
import User from '../models/User.js';
import { generateProblem, validateSolution } from './problemService.js';
import { calculateEloChange, calculateDrawElo, getRank } from './eloService.js';

/**
 * Active duels stored in memory.
 * Map<duelId, DuelState>
 *
 * @typedef {Object} DuelState
 * @property {string} duelId
 * @property {Object} player1 - { userId, username, elo, ws }
 * @property {Object} player2 - { userId, username, elo, ws }
 * @property {Object} problem - { title, description, starterCode, testCases }
 * @property {string} language
 * @property {string} difficulty
 * @property {number} startTime - Epoch ms when duel started
 * @property {number} duration - Duration in seconds
 * @property {NodeJS.Timeout} timer - The countdown timer
 * @property {Map<string, Object>} bestSubmission - Best submission per user
 * @property {'initializing'|'countdown'|'active'|'completed'} status
 */
const activeDuels = new Map();

/** Countdown duration before a duel starts (seconds) */
const COUNTDOWN_SECONDS = 5;

/** Default duel duration (seconds) */
const DEFAULT_DURATION = 900; // 15 minutes

/**
 * Sends a JSON message to a WebSocket if it's open.
 * @param {WebSocket} ws
 * @param {Object} payload
 */
function safeSend(ws, payload) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/**
 * Broadcasts a message to both players in a duel.
 * @param {DuelState} duel
 * @param {Object} payload
 */
function broadcastToDuel(duel, payload) {
  safeSend(duel.player1.ws, payload);
  safeSend(duel.player2.ws, payload);
}

/**
 * Creates and initializes a new duel between two matched players.
 * @param {Object} p1 - { userId, username, elo, ws }
 * @param {Object} p2 - { userId, username, elo, ws }
 * @param {string} formatMode - 'duel-1q' or 'duel-3q'.
 * @param {string} [difficulty='medium'] - Problem difficulty.
 * @returns {Promise<string>} The duel ID.
 */
export async function createDuel(p1, p2, formatMode, difficulty = 'medium') {
  const duelId = uuidv4();

  const is3q = formatMode === 'duel-3q';
  const duration = is3q ? 1800 : 600; // 30 mins or 10 mins

  const duelState = {
    duelId,
    player1: { ...p1 },
    player2: { ...p2 },
    problems: [], // Array of problems
    formatMode,
    difficulty,
    startTime: null,
    duration: duration,
    timer: null,
    tickInterval: null,
    bestSubmission: new Map(),
    status: 'initializing',
  };

  activeDuels.set(duelId, duelState);

  // Notify both players that a match was found
  const matchPayload = {
    type: 'match:found',
    data: {
      duelId,
      mode: formatMode,
      difficulty,
    },
  };

  safeSend(p1.ws, {
    ...matchPayload,
    data: {
      ...matchPayload.data,
      opponent: { username: p2.username, elo: p2.elo, rank: getRank(p2.elo) },
    },
  });

  safeSend(p2.ws, {
    ...matchPayload,
    data: {
      ...matchPayload.data,
      opponent: { username: p1.username, elo: p1.elo, rank: getRank(p1.elo) },
    },
  });

  // Generate problems asynchronously
  console.log(`⚔️ Duel ${duelId}: Generating ${is3q ? 3 : 1} ${difficulty} problem(s)...`);

  try {
    const count = is3q ? 3 : 1;
    const problems = await generateProblem(count, difficulty);
    duelState.problems = problems;

    // Create DB record
    await Duel.create({
      id: duelId,
      player1Id: p1.userId,
      player2Id: p2.userId,
      mode: is3q ? '3q' : '1q',
      status: 'active',
      problems: problems,
    });

    // Start countdown
    startCountdown(duelState);
  } catch (error) {
    console.error(`⚔️ Duel ${duelId}: Problem generation failed:`, error.message);
    broadcastToDuel(duelState, {
      type: 'duel:error',
      data: { message: 'Failed to generate problem. Please try again.' },
    });
    activeDuels.delete(duelId);
  }

  return duelId;
}

/**
 * Starts the pre-duel countdown.
 * @param {DuelState} duel
 */
function startCountdown(duel) {
  duel.status = 'countdown';
  let remaining = COUNTDOWN_SECONDS;

  console.log(`⚔️ Duel ${duel.duelId}: Countdown started (${COUNTDOWN_SECONDS}s)`);

  broadcastToDuel(duel, {
    type: 'duel:countdown',
    data: { seconds: remaining },
  });

  const countdownInterval = setInterval(() => {
    remaining--;
    broadcastToDuel(duel, {
      type: 'duel:countdown',
      data: { seconds: remaining },
    });

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      startDuel(duel);
    }
  }, 1000);
}

/**
 * Starts the active duel phase.
 * @param {DuelState} duel
 */
function startDuel(duel) {
  duel.status = 'active';
  duel.startTime = Date.now();

  console.log(`⚔️ Duel ${duel.duelId}: STARTED! (${duel.duration}s)`);

  // Send problems to both players — only show first 2 test cases (visible)
  const safeProblems = duel.problems.map(p => ({
    title: p.title,
    description: p.description,
    starterCode: p.starterCode,
    visibleTestCases: p.testCases.slice(0, 2),
    totalTestCases: p.testCases.length
  }));

  broadcastToDuel(duel, {
    type: 'duel:start',
    data: {
      duelId: duel.duelId,
      problems: safeProblems,
      duration: duel.duration,
    },
  });

  // Start the timer
  duel.tickInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - duel.startTime) / 1000);
    const remaining = duel.duration - elapsed;

    if (remaining <= 0) {
      handleTimeout(duel.duelId);
    } else if (remaining <= 60 || remaining % 30 === 0) {
      // Send timer updates frequently in last minute, every 30s otherwise
      broadcastToDuel(duel, {
        type: 'duel:timer',
        data: { remainingSeconds: remaining },
      });
    }
  }, 1000);

  // Set absolute timeout
  duel.timer = setTimeout(() => {
    handleTimeout(duel.duelId);
  }, duel.duration * 1000);
}

/**
 * Handles a code submission from a player.
 * @param {string} duelId - The duel ID.
 * @param {string} userId - The submitting user's ID.
 * @param {string} code - The submitted code.
 * @param {string} language - The programming language used.
 * @param {number} problemIndex - The index of the problem being solved.
 * @returns {Promise<void>}
 */
export async function handleSubmission(duelId, userId, code, language, problemIndex = 0) {
  const duel = activeDuels.get(duelId);
  if (!duel || duel.status !== 'active') return;

  const isPlayer1 = duel.player1.userId === userId;
  const player = isPlayer1 ? duel.player1 : duel.player2;
  const opponent = isPlayer1 ? duel.player2 : duel.player1;

  console.log(`⚔️ Duel ${duelId}: ${player.username} submitted code for problem ${problemIndex + 1} in ${language}`);

  const problem = duel.problems[problemIndex];
  if (!problem) return;

  // Validate the solution against ALL test cases for this specific problem
  const result = await validateSolution(code, language, problem.testCases);

  // Record in DB
  try {
    await Duel.submitSolution({
      duelId,
      userId,
      code,
      testsPassed: result.passed,
      totalTests: result.total,
      executionTimeMs: result.results.reduce((sum, r) => sum + (r.duration || 0), 0),
      stdout: result.results.map((r) => r.actual).join('\n---\n'),
      stderr: result.results.map((r) => r.error).filter(Boolean).join('\n'),
    });
  } catch (err) {
    console.error('Failed to store submission:', err.message);
  }

  // Track best submission per problem
  if (!duel.bestSubmission.has(userId)) {
    duel.bestSubmission.set(userId, { problems: [] });
  }
  const userSubmissions = duel.bestSubmission.get(userId);
  const prev = userSubmissions.problems[problemIndex];

  if (!prev || result.passed > prev.passed) {
    userSubmissions.problems[problemIndex] = {
      passed: result.passed,
      total: result.total,
      code,
    };
  }

  // Calculate total score across all problems
  let totalTestsPassed = 0;
  let overallTotalTests = 0;
  for (let i = 0; i < duel.problems.length; i++) {
    const sub = userSubmissions.problems[i];
    totalTestsPassed += sub ? sub.passed : 0;
    overallTotalTests += duel.problems[i].testCases.length;
  }

  // Send result back to the submitter (with full details)
  safeSend(player.ws, {
    type: 'duel:submission_result',
    data: {
      testsPassed: result.passed,
      totalTests: result.total,
      results: result.results.map((r, i) => ({
        testCase: i + 1,
        passed: r.passed,
        // Only show details for visible test cases (first 2)
        input: i < 2 ? r.input : '(hidden)',
        expected: i < 2 ? r.expected : '(hidden)',
        actual: r.actual,
        error: r.error,
      })),
    },
  });

  // Notify opponent of progress (just the score, not the code)
  safeSend(opponent.ws, {
    type: 'duel:opponent_progress',
    data: {
      testsPassed: totalTestsPassed,
      totalTests: overallTotalTests,
      username: player.username,
      problemIndex,
    },
  });

  // Check if ALL tests for ALL problems passed → instant win
  if (totalTestsPassed === overallTotalTests) {
    console.log(`⚔️ Duel ${duelId}: ${player.username} solved everything! 🎉`);
    await completeDuel(duelId, userId);
  }
}

/**
 * Handles a code run (test) from a player without submitting.
 * @param {string} duelId - The duel ID.
 * @param {string} userId - The running user's ID.
 * @param {string} code - The code to run.
 * @param {string} language - The programming language used.
 * @param {number} problemIndex - The index of the problem being solved.
 * @returns {Promise<void>}
 */
export async function handleRun(duelId, userId, code, language, problemIndex = 0) {
  const duel = activeDuels.get(duelId);
  if (!duel || duel.status !== 'active') return;

  const isPlayer1 = duel.player1.userId === userId;
  const player = isPlayer1 ? duel.player1 : duel.player2;

  console.log(`⚔️ Duel ${duelId}: ${player.username} is running code on prob ${problemIndex + 1} in ${language}`);

  const problem = duel.problems[problemIndex];
  if (!problem) return;

  // Validate the solution against ONLY the visible test cases
  const visibleTestCases = problem.testCases.slice(0, 2);
  const result = await validateSolution(code, language, visibleTestCases);

  // Send result back ONLY to the player who ran it
  safeSend(player.ws, {
    type: 'duel:run_result',
    data: {
      testsPassed: result.passed,
      totalTests: result.total,
      results: result.results,
    },
  });
}

/**
 * Handles duel timeout — determines winner by most tests passed.
 * @param {string} duelId
 */
async function handleTimeout(duelId) {
  const duel = activeDuels.get(duelId);
  if (!duel || duel.status === 'completed') return;

  console.log(`⚔️ Duel ${duelId}: TIME'S UP!`);

  const p1Subs = duel.bestSubmission.get(duel.player1.userId)?.problems || [];
  const p2Subs = duel.bestSubmission.get(duel.player2.userId)?.problems || [];

  const p1Score = p1Subs.reduce((sum, p) => sum + (p ? p.passed : 0), 0);
  const p2Score = p2Subs.reduce((sum, p) => sum + (p ? p.passed : 0), 0);

  let winnerId = null;
  if (p1Score > p2Score) {
    winnerId = duel.player1.userId;
  } else if (p2Score > p1Score) {
    winnerId = duel.player2.userId;
  }
  // If tied, it's a draw (winnerId stays null)

  await completeDuel(duelId, winnerId);
}

/**
 * Completes a duel, calculates Elo changes, and notifies players.
 * @param {string} duelId
 * @param {string|null} winnerId - Winner's ID or null for draw.
 */
async function completeDuel(duelId, winnerId) {
  const duel = activeDuels.get(duelId);
  if (!duel || duel.status === 'completed') return;

  duel.status = 'completed';

  // Clear timers
  if (duel.timer) clearTimeout(duel.timer);
  if (duel.tickInterval) clearInterval(duel.tickInterval);

  let eloChangeP1 = 0;
  let eloChangeP2 = 0;

  if (winnerId) {
    // There is a winner
    const isP1Winner = winnerId === duel.player1.userId;
    const winnerElo = isP1Winner ? duel.player1.elo : duel.player2.elo;
    const loserElo = isP1Winner ? duel.player2.elo : duel.player1.elo;

    const changes = calculateEloChange(winnerElo, loserElo);

    eloChangeP1 = isP1Winner ? changes.winnerDelta : changes.loserDelta;
    eloChangeP2 = isP1Winner ? changes.loserDelta : changes.winnerDelta;

    // Update Elo in DB
    try {
      await User.updateElo(
        duel.player1.userId,
        duel.player1.elo + eloChangeP1,
        isP1Winner
      );
      await User.updateElo(
        duel.player2.userId,
        duel.player2.elo + eloChangeP2,
        !isP1Winner
      );
    } catch (err) {
      console.error('Failed to update Elo:', err.message);
    }
  } else {
    // Draw
    const drawChanges = calculateDrawElo(duel.player1.elo, duel.player2.elo);
    eloChangeP1 = drawChanges.deltaA;
    eloChangeP2 = drawChanges.deltaB;

    try {
      await User.updateElo(duel.player1.userId, drawChanges.newEloA, false);
      await User.updateElo(duel.player2.userId, drawChanges.newEloB, false);
    } catch (err) {
      console.error('Failed to update Elo:', err.message);
    }
  }

  // Update duel record in DB
  try {
    await Duel.complete(duelId, winnerId, eloChangeP1, eloChangeP2);
  } catch (err) {
    console.error('Failed to complete duel record:', err.message);
  }

  const p1Subs = duel.bestSubmission.get(duel.player1.userId)?.problems || [];
  const p2Subs = duel.bestSubmission.get(duel.player2.userId)?.problems || [];
  const p1Score = p1Subs.reduce((sum, p) => sum + (p ? p.passed : 0), 0);
  const p2Score = p2Subs.reduce((sum, p) => sum + (p ? p.passed : 0), 0);
  const totalScore = duel.problems.reduce((sum, p) => sum + p.testCases.length, 0);

  const winnerUsername = winnerId
    ? winnerId === duel.player1.userId
      ? duel.player1.username
      : duel.player2.username
    : null;

  const resultPayload = {
    type: 'duel:complete',
    data: {
      duelId,
      winnerId,
      winnerUsername,
      isDraw: !winnerId,
      player1: {
        userId: duel.player1.userId,
        username: duel.player1.username,
        oldElo: duel.player1.elo,
        newElo: duel.player1.elo + eloChangeP1,
        eloChange: eloChangeP1,
        newRank: getRank(duel.player1.elo + eloChangeP1),
        testsPassed: p1Score,
        totalTests: totalScore,
      },
      player2: {
        userId: duel.player2.userId,
        username: duel.player2.username,
        oldElo: duel.player2.elo,
        newElo: duel.player2.elo + eloChangeP2,
        eloChange: eloChangeP2,
        newRank: getRank(duel.player2.elo + eloChangeP2),
        testsPassed: p2Score,
        totalTests: totalScore,
      },
    },
  };

  broadcastToDuel(duel, resultPayload);

  console.log(
    `⚔️ Duel ${duelId}: COMPLETE! Winner: ${winnerUsername || 'DRAW'} | P1: ${eloChangeP1 >= 0 ? '+' : ''}${eloChangeP1} | P2: ${eloChangeP2 >= 0 ? '+' : ''}${eloChangeP2}`
  );

  // Clean up after a delay (let clients process the result)
  setTimeout(() => {
    activeDuels.delete(duelId);
  }, 30000);
}

/**
 * Handles a player disconnecting from an active duel.
 * The disconnecting player forfeits.
 * @param {string} duelId
 * @param {string} userId
 */
export async function handleDisconnect(duelId, userId) {
  const duel = activeDuels.get(duelId);
  if (!duel || duel.status === 'completed') return;

  const isPlayer1 = duel.player1.userId === userId;
  const disconnectedPlayer = isPlayer1 ? duel.player1 : duel.player2;
  const remainingPlayer = isPlayer1 ? duel.player2 : duel.player1;

  console.log(`⚔️ Duel ${duelId}: ${disconnectedPlayer.username} disconnected (forfeit)`);

  // Notify remaining player
  safeSend(remainingPlayer.ws, {
    type: 'duel:opponent_disconnected',
    data: { username: disconnectedPlayer.username },
  });

  // Remaining player wins
  await completeDuel(duelId, remainingPlayer.userId);
}

/**
 * Gets an active duel by ID.
 * @param {string} duelId
 * @returns {DuelState|undefined}
 */
export function getActiveDuel(duelId) {
  return activeDuels.get(duelId);
}

/**
 * Attaches a WebSocket to a player in an active duel (for reconnection or
 * when the player navigates to the duel page after matchmaking).
 * @param {string} duelId
 * @param {string} userId
 * @param {WebSocket} ws
 * @returns {boolean} True if successfully attached.
 */
export function attachPlayerWs(duelId, userId, ws) {
  const duel = activeDuels.get(duelId);
  if (!duel) return false;

  let player = null;
  if (duel.player1.userId === userId) player = duel.player1;
  else if (duel.player2.userId === userId) player = duel.player2;

  if (player) {
    player.ws = ws;
    
    // Clear any pending forfeit timeouts
    if (duel.disconnectTimeouts && duel.disconnectTimeouts[userId]) {
      clearTimeout(duel.disconnectTimeouts[userId]);
      delete duel.disconnectTimeouts[userId];
      console.log(`⚔️ Duel ${duelId}: ${player.username} reconnected in time.`);
    }

    // Resync state if active
    if (duel.status === 'active') {
      const pBest = duel.bestSubmission.get(userId);
      const code = pBest ? pBest.code : duel.problems[0].starterCode;
      
      safeSend(ws, {
        type: 'duel:start',
        data: {
          duelId: duel.duelId,
          problems: duel.problems.map(p => ({
            title: p.title,
            description: p.description,
            starterCode: p.starterCode,
            visibleTestCases: p.testCases.slice(0, 2),
            totalTestCases: p.testCases.length
          })),
          duration: duel.duration,
        },
      });

      const elapsed = Math.floor((Date.now() - duel.startTime) / 1000);
      const remaining = Math.max(0, duel.duration - elapsed);
      safeSend(ws, {
        type: 'duel:timer',
        data: { remainingSeconds: remaining },
      });
    }

    return true;
  }
  
  return false;
}

export const handleForfeit = handleDisconnect;

export default {
  createDuel,
  handleSubmission,
  handleRun,
  handleForfeit,
  handleDisconnect,
  getActiveDuel,
  attachPlayerWs,
};
