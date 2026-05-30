/**
 * @module services/matchmakingService
 * @description In-memory matchmaking queue that pairs users for collaborative
 * coding sessions or competitive duels based on preferences and Elo proximity.
 */

/**
 * Queue entries: Map<mode, Array<QueueEntry>>
 * @typedef {{ userId: string, username: string, elo: number, language: string, ws: WebSocket, joinedAt: number }} QueueEntry
 */
const queues = new Map([
  ['collab', []],
  ['duel', []],
]);

/** Elo range starts at ±200 and widens by 50 every 10 seconds */
const BASE_ELO_RANGE = 200;
const ELO_RANGE_EXPANSION = 50;
const ELO_EXPANSION_INTERVAL = 10000; // ms

/** Match check interval */
let matchInterval = null;

/** Callback for when a match is found */
let onMatchFoundCallback = null;

/**
 * Sets the callback to be invoked when a match is found.
 * @param {function} callback - Called with (mode, player1Entry, player2Entry)
 */
export function onMatchFound(callback) {
  onMatchFoundCallback = callback;
}

/**
 * Adds a user to the matchmaking queue.
 * @param {'collab'|'duel'} mode - Queue mode.
 * @param {{ id: string, username: string, elo_rating?: number }} user - User info.
 * @param {string} language - Preferred language.
 * @param {WebSocket} ws - The user's WebSocket connection.
 * @returns {{ position: number, queueSize: number }}
 */
export function joinQueue(mode, user, language, ws) {
  const queue = queues.get(mode);
  if (!queue) throw new Error(`Invalid mode: ${mode}`);

  // Remove if already in queue
  leaveQueue(mode, user.id);

  const entry = {
    userId: user.id,
    username: user.username,
    elo: user.elo_rating || 1000,
    language: language.toLowerCase(),
    ws,
    joinedAt: Date.now(),
  };

  queue.push(entry);

  console.log(`🎯 Matchmaking: ${user.username} joined ${mode} queue (${queue.length} waiting, lang=${language})`);

  return {
    position: queue.length,
    queueSize: queue.length,
  };
}

/**
 * Removes a user from a specific queue.
 * @param {'collab'|'duel'} mode - Queue mode.
 * @param {string} userId - The user to remove.
 */
export function leaveQueue(mode, userId) {
  const queue = queues.get(mode);
  if (!queue) return;

  const idx = queue.findIndex((e) => e.userId === userId);
  if (idx !== -1) {
    const removed = queue.splice(idx, 1)[0];
    console.log(`🎯 Matchmaking: ${removed.username} left ${mode} queue (${queue.length} waiting)`);
  }
}

/**
 * Removes a user from ALL queues (called on disconnect).
 * @param {string} userId - The user to remove.
 */
export function leaveAllQueues(userId) {
  for (const [mode] of queues) {
    leaveQueue(mode, userId);
  }
}

/**
 * Gets queue statistics for the lobby UI.
 * @returns {{ collab: number, duel: number }}
 */
export function getQueueStats() {
  return {
    collab: queues.get('collab').length,
    duel: queues.get('duel').length,
  };
}

/**
 * Attempts to find matches in all queues.
 * Called periodically by the match ticker.
 */
function findMatches() {
  findCollabMatch();
  findDuelMatch();
}

/**
 * Finds a collab match: pairs any two users wanting the same language.
 * @private
 */
function findCollabMatch() {
  const queue = queues.get('collab');
  if (queue.length < 2) return;

  // Group by language
  const byLanguage = new Map();
  for (const entry of queue) {
    if (!byLanguage.has(entry.language)) {
      byLanguage.set(entry.language, []);
    }
    byLanguage.get(entry.language).push(entry);
  }

  // Pair first two in each language group
  for (const [, entries] of byLanguage) {
    while (entries.length >= 2) {
      const p1 = entries.shift();
      const p2 = entries.shift();

      // Remove from main queue
      const idx1 = queue.indexOf(p1);
      if (idx1 !== -1) queue.splice(idx1, 1);
      const idx2 = queue.indexOf(p2);
      if (idx2 !== -1) queue.splice(idx2, 1);

      console.log(`🎯 Collab match found: ${p1.username} + ${p2.username} (${p1.language})`);

      if (onMatchFoundCallback) {
        onMatchFoundCallback('collab', p1, p2);
      }
    }
  }
}

/**
 * Finds a duel match: pairs users within dynamic Elo range wanting the same language.
 * Elo range widens over time to prevent infinite waits.
 * @private
 */
function findDuelMatch() {
  const queue = queues.get('duel');
  if (queue.length < 2) return;

  const now = Date.now();
  const matched = new Set();

  // Group by language
  const byLanguage = new Map();
  for (const entry of queue) {
    if (!byLanguage.has(entry.language)) {
      byLanguage.set(entry.language, []);
    }
    byLanguage.get(entry.language).push(entry);
  }

  for (const [, entries] of byLanguage) {
    // Sort by Elo for efficient matching
    entries.sort((a, b) => a.elo - b.elo);

    for (let i = 0; i < entries.length; i++) {
      if (matched.has(entries[i].userId)) continue;

      for (let j = i + 1; j < entries.length; j++) {
        if (matched.has(entries[j].userId)) continue;

        const p1 = entries[i];
        const p2 = entries[j];

        // Calculate dynamic Elo range based on wait time
        const waitTime = Math.max(now - p1.joinedAt, now - p2.joinedAt);
        const expansions = Math.floor(waitTime / ELO_EXPANSION_INTERVAL);
        const eloRange = BASE_ELO_RANGE + expansions * ELO_RANGE_EXPANSION;

        const eloDiff = Math.abs(p1.elo - p2.elo);

        if (eloDiff <= eloRange) {
          matched.add(p1.userId);
          matched.add(p2.userId);

          console.log(
            `⚔️ Duel match found: ${p1.username} (${p1.elo}) vs ${p2.username} (${p2.elo}) [diff=${eloDiff}, range=${eloRange}]`
          );

          if (onMatchFoundCallback) {
            onMatchFoundCallback('duel', p1, p2);
          }
          break;
        }
      }
    }
  }

  // Remove matched users from queue
  for (const userId of matched) {
    const idx = queue.findIndex((e) => e.userId === userId);
    if (idx !== -1) queue.splice(idx, 1);
  }
}

/**
 * Starts the match-finding ticker (runs every 2 seconds).
 */
export function startMatchmaking() {
  if (matchInterval) return;
  matchInterval = setInterval(findMatches, 2000);
  console.log('🎯 Matchmaking service started (checking every 2s)');
}

/**
 * Stops the match-finding ticker.
 */
export function stopMatchmaking() {
  if (matchInterval) {
    clearInterval(matchInterval);
    matchInterval = null;
    console.log('🎯 Matchmaking service stopped');
  }
}

export default {
  joinQueue,
  leaveQueue,
  leaveAllQueues,
  getQueueStats,
  onMatchFound,
  startMatchmaking,
  stopMatchmaking,
};
