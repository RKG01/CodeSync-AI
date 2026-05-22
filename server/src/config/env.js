/**
 * @module config/env
 * @description Validates and exports environment variables used across the application.
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * @typedef {Object} EnvConfig
 * @property {number} PORT - Express server port
 * @property {number} YJS_PORT - Yjs WebSocket server port
 * @property {string} NODE_ENV - Application environment
 * @property {string} DATABASE_URL - PostgreSQL connection string
 * @property {string} REDIS_URL - Redis connection string
 * @property {string} JWT_SECRET - JWT signing secret
 * @property {string} JWT_REFRESH_SECRET - JWT refresh token secret
 * @property {string} JWT_EXPIRES_IN - JWT access token expiry
 * @property {string} JWT_REFRESH_EXPIRES_IN - JWT refresh token expiry
 * @property {string} HF_API_KEY - Hugging Face API key
 * @property {string} HF_MODEL - Hugging Face model to use
 * @property {string|string[]} CORS_ORIGIN - Allowed CORS origin(s)
 */

/** @type {EnvConfig} */
const env = {
  PORT: parseInt(process.env.PORT, 10) || 4000,
  YJS_PORT: parseInt(process.env.YJS_PORT, 10) || 1234,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/codesync',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  HF_API_KEY: process.env.HF_API_KEY || '',
  HF_MODEL: process.env.HF_MODEL || 'Qwen/Qwen2.5-Coder-32B-Instruct',
  CORS_ORIGIN: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(url => url.trim()) 
    : 'http://localhost:3000',
};

/**
 * Validates that all critical environment variables are present.
 * Logs warnings for missing non-critical vars in development.
 * @throws {Error} If critical variables are missing in production.
 */
export function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (env.NODE_ENV === 'production' && missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (missing.length > 0) {
    console.warn(`⚠️  Missing env vars (using defaults): ${missing.join(', ')}`);
  }

  if (!env.HF_API_KEY) {
    console.warn('⚠️  HF_API_KEY not set — AI features will use free tier (may be rate-limited).');
  }
}

export default env;
