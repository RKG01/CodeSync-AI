/**
 * @module config/migrate
 * @description Runs SQL migration files against the PostgreSQL database on startup.
 * Skips if using in-memory database. Safe to re-run (migrations use IF NOT EXISTS).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './database.js';
import { isMemoryMode } from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

/**
 * Runs all .sql migration files in order.
 * Each migration should be idempotent (safe to re-run).
 */
export async function runMigrations() {
  if (isMemoryMode()) {
    console.log('📝 Skipping SQL migrations (using in-memory database)');
    return;
  }

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn('⚠️  No migrations directory found');
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Ensures 001, 002, etc. run in order

  console.log(`📦 Running ${files.length} database migration(s)...`);

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      await query(sql);
      console.log(`  ✅ ${file}`);
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`);
      // Don't throw — let the server continue even if a migration has issues
    }
  }

  console.log('📦 Migrations complete');
}
