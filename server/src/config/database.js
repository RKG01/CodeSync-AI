/**
 * @module config/database
 * @description PostgreSQL connection pool with in-memory fallback for demo mode.
 * When PostgreSQL is unavailable, automatically falls back to an in-memory store
 * so the app can run without any external dependencies.
 */

import pg from 'pg';
import env from './env.js';
import { memoryQuery, initMemoryDb } from './memoryDb.js';

const { Pool } = pg;

let pool = null;
let useMemoryDb = false;

/**
 * Try to create a PostgreSQL pool. If it fails, we'll fall back to memory mode.
 */
try {
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err.message);
  });
} catch (err) {
  console.warn('⚠️  Could not create PostgreSQL pool:', err.message);
  useMemoryDb = true;
}

/**
 * Executes a parameterized SQL query against the database.
 * Falls back to in-memory query engine if PostgreSQL is unavailable.
 * @param {string} text - SQL query text with $1, $2, etc. placeholders.
 * @param {Array} [params=[]] - Array of parameter values.
 * @returns {Promise<pg.QueryResult>} The query result.
 */
export async function query(text, params = []) {
  if (useMemoryDb) {
    return memoryQuery(text, params);
  }

  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      console.log('📊 Query executed', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('❌ Database query error:', { text: text.substring(0, 80), error: error.message });
    throw error;
  }
}

/**
 * Gets a client from the pool for transactions.
 * In memory mode, returns a mock client.
 * @returns {Promise<pg.PoolClient>}
 */
export async function getClient() {
  if (useMemoryDb) {
    return {
      query: (text, params) => memoryQuery(text, params),
      release: () => { },
    };
  }
  return pool.connect();
}

/**
 * Tests the database connection. Falls back to memory DB on failure.
 * @returns {Promise<boolean>} True if connection is healthy.
 */
export async function testConnection() {
  if (useMemoryDb) {
    await initMemoryDb();
    return true;
  }

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully');
    return true;
  } catch (error) {
    console.warn('⚠️  PostgreSQL unavailable:', error.message);
    
    // In production, we MUST use a real database. Failing over to memory DB
    // causes ephemeral data loss on every Render deploy.
    if (env.NODE_ENV === 'production') {
      console.error('❌ FATAL: Cannot connect to PostgreSQL in production. Exiting.');
      process.exit(1);
    }
    
    console.warn('📝 Switching to in-memory database (demo mode)');
    useMemoryDb = true;
    await initMemoryDb();
    return true;
  }
}

/**
 * Gracefully closes all pool connections.
 * @returns {Promise<void>}
 */
export async function closePool() {
  if (pool && !useMemoryDb) {
    await pool.end();
    console.log('🔌 PostgreSQL pool closed');
  } else {
    console.log('🔌 In-memory database closed');
  }
}

export function isMemoryMode() {
  return useMemoryDb;
}

export default pool;
