/**
 * @module config/redis
 * @description Redis client connection and helpers.
 */

import { createClient } from 'redis';
import env from './env.js';

/**
 * Redis client instance.
 * @type {import('redis').RedisClientType}
 */
const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis max reconnection attempts reached');
        return new Error('Redis max reconnection attempts reached');
      }
      return Math.min(retries * 200, 3000);
    },
  },
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err.message);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

/**
 * Connects the Redis client. Safe to call multiple times.
 * @returns {Promise<void>}
 */
export async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      console.warn('⚠️  Continuing without Redis — caching and presence features will be unavailable.');
    }
  }
}

/**
 * Disconnects the Redis client gracefully.
 * @returns {Promise<void>}
 */
export async function disconnectRedis() {
  if (redisClient.isOpen) {
    await redisClient.quit();
    console.log('🔌 Redis disconnected');
  }
}

/**
 * Checks if the Redis client is connected and ready.
 * @returns {boolean}
 */
export function isRedisReady() {
  return redisClient.isOpen && redisClient.isReady;
}

export default redisClient;
