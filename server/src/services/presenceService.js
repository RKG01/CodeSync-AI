/**
 * @module services/presenceService
 * @description Tracks online users and cursor positions per project room using Redis.
 */

import redisClient, { isRedisReady } from '../config/redis.js';

/** Key prefix for presence sets */
const PRESENCE_PREFIX = 'presence:';
/** Key prefix for cursor data */
const CURSOR_PREFIX = 'cursor:';
/** Presence entry TTL in seconds (5 minutes — refreshed on activity) */
const PRESENCE_TTL = 300;

/**
 * Adds a user to a project's online presence list.
 * @param {string} projectId - The project UUID.
 * @param {Object} user - The user object.
 * @param {string} user.id - User UUID.
 * @param {string} user.username - Username.
 * @param {string} [user.avatar_url] - Avatar URL.
 * @returns {Promise<void>}
 */
export async function addUser(projectId, user) {
  if (!isRedisReady()) return;

  const key = `${PRESENCE_PREFIX}${projectId}`;
  const userData = JSON.stringify({
    id: user.id,
    username: user.username,
    avatar_url: user.avatar_url || null,
    joinedAt: new Date().toISOString(),
  });

  try {
    await redisClient.hSet(key, user.id, userData);
    await redisClient.expire(key, PRESENCE_TTL);
  } catch (error) {
    console.error('Presence addUser error:', error.message);
  }
}

/**
 * Removes a user from a project's online presence list and clears their cursor.
 * @param {string} projectId - The project UUID.
 * @param {string} userId - The user UUID to remove.
 * @returns {Promise<void>}
 */
export async function removeUser(projectId, userId) {
  if (!isRedisReady()) return;

  try {
    const presenceKey = `${PRESENCE_PREFIX}${projectId}`;
    const cursorKey = `${CURSOR_PREFIX}${projectId}`;

    await redisClient.hDel(presenceKey, userId);
    await redisClient.hDel(cursorKey, userId);
  } catch (error) {
    console.error('Presence removeUser error:', error.message);
  }
}

/**
 * Gets all online users for a project.
 * @param {string} projectId - The project UUID.
 * @returns {Promise<Array<Object>>} Array of online user objects.
 */
export async function getOnlineUsers(projectId) {
  if (!isRedisReady()) return [];

  try {
    const key = `${PRESENCE_PREFIX}${projectId}`;
    const users = await redisClient.hGetAll(key);

    return Object.values(users).map((userData) => {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error('Presence getOnlineUsers error:', error.message);
    return [];
  }
}

/**
 * Updates a user's cursor position in a project.
 * @param {string} projectId - The project UUID.
 * @param {string} userId - The user UUID.
 * @param {Object} cursor - Cursor position data.
 * @param {string} cursor.fileId - The file the cursor is in.
 * @param {number} cursor.line - Line number.
 * @param {number} cursor.column - Column number.
 * @param {Object} [cursor.selection] - Optional selection range.
 * @returns {Promise<void>}
 */
export async function updateCursor(projectId, userId, cursor) {
  if (!isRedisReady()) return;

  try {
    const key = `${CURSOR_PREFIX}${projectId}`;
    const cursorData = JSON.stringify({
      userId,
      ...cursor,
      updatedAt: new Date().toISOString(),
    });

    await redisClient.hSet(key, userId, cursorData);
    await redisClient.expire(key, PRESENCE_TTL);
  } catch (error) {
    console.error('Presence updateCursor error:', error.message);
  }
}

/**
 * Gets all cursor positions for a project.
 * @param {string} projectId - The project UUID.
 * @returns {Promise<Array<Object>>} Array of cursor position objects.
 */
export async function getCursors(projectId) {
  if (!isRedisReady()) return [];

  try {
    const key = `${CURSOR_PREFIX}${projectId}`;
    const cursors = await redisClient.hGetAll(key);

    return Object.values(cursors).map((data) => {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error('Presence getCursors error:', error.message);
    return [];
  }
}

/**
 * Refreshes the presence TTL for a project (called on activity).
 * @param {string} projectId - The project UUID.
 * @returns {Promise<void>}
 */
export async function refreshPresence(projectId) {
  if (!isRedisReady()) return;

  try {
    const presenceKey = `${PRESENCE_PREFIX}${projectId}`;
    const cursorKey = `${CURSOR_PREFIX}${projectId}`;

    await redisClient.expire(presenceKey, PRESENCE_TTL);
    await redisClient.expire(cursorKey, PRESENCE_TTL);
  } catch (error) {
    console.error('Presence refresh error:', error.message);
  }
}

export default { addUser, removeUser, getOnlineUsers, updateCursor, getCursors, refreshPresence };
