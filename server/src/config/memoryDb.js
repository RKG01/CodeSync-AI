/**
 * @module config/memoryDb
 * @description In-memory database fallback when PostgreSQL is unavailable.
 * Data is stored in memory and lost on restart — for development/demo only.
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'local_db.json');

// ─── In-Memory Tables ────────────────────────────────────────────────────────

const tables = {
  users: [],
  projects: [],
  project_collaborators: [],
  files: [],
  ai_conversations: [],
  ai_messages: [],
  chat_messages: [],
  duels: [],
  duel_submissions: [],
};

/**
 * Seed a demo user so you can log in immediately.
 */
async function seedDemoData() {
  const hash = await bcrypt.hash('password123', 10);
  const demoUser = {
    id: uuidv4(),
    username: 'demo',
    email: 'demo@codesync.ai',
    password_hash: hash,
    avatar_url: null,
    elo_rating: 1000,
    matches_played: 0,
    matches_won: 0,
    preferred_languages: ['javascript'],
    created_at: new Date(),
    updated_at: new Date(),
    last_active_at: new Date(),
  };
  tables.users.push(demoUser);

  const rivalUser = {
    id: uuidv4(),
    username: 'rival',
    email: 'rival@codesync.ai',
    password_hash: hash,
    avatar_url: null,
    elo_rating: 1200,
    matches_played: 10,
    matches_won: 6,
    preferred_languages: ['javascript', 'python'],
    created_at: new Date(),
    updated_at: new Date(),
    last_active_at: new Date(),
  };
  tables.users.push(rivalUser);
  const demoProject = {
    id: uuidv4(),
    name: 'Welcome Project',
    description: 'A sample project to get you started',
    owner_id: demoUser.id,
    language: 'javascript',
    is_public: true,
    created_at: new Date(),
    updated_at: new Date(),
  };
  tables.projects.push(demoProject);

  // Add collaborator record for owner
  tables.project_collaborators.push({
    project_id: demoProject.id,
    user_id: demoUser.id,
    role: 'owner',
    joined_at: new Date(),
  });

  const rootFile = {
    id: uuidv4(),
    project_id: demoProject.id,
    path: '/index.js',
    name: 'index.js',
    is_directory: false,
    content: '// Welcome to CodeSync AI!\n// Start coding collaboratively...\n\nconsole.log("Hello, CodeSync!");\n',
    language: 'javascript',
    parent_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
  tables.files.push(rootFile);

  const srcDir = {
    id: uuidv4(),
    project_id: demoProject.id,
    path: '/src',
    name: 'src',
    is_directory: true,
    content: null,
    language: null,
    parent_id: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
  tables.files.push(srcDir);

  const appFile = {
    id: uuidv4(),
    project_id: demoProject.id,
    path: '/src/app.js',
    name: 'app.js',
    is_directory: false,
    content: 'import express from "express";\n\nconst app = express();\n\napp.get("/", (req, res) => {\n  res.json({ message: "Welcome to CodeSync AI!" });\n});\n\nexport default app;\n',
    language: 'javascript',
    parent_id: srcDir.id,
    created_at: new Date(),
    updated_at: new Date(),
  };
  tables.files.push(appFile);

  console.log('📝 Demo data seeded: user=demo@codesync.ai password=password123');
}

// ─── Normalize SQL for matching ─────────────────────────────────────────────

function normalize(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

// ─── Extract table name ─────────────────────────────────────────────────────

function getTableName(text) {
  const n = normalize(text);
  let m;
  m = n.match(/INSERT\s+INTO\s+(\w+)/i);
  if (m) return m[1].toLowerCase();
  m = n.match(/FROM\s+(\w+)/i);
  if (m) return m[1].toLowerCase();
  m = n.match(/UPDATE\s+(\w+)/i);
  if (m) return m[1].toLowerCase();
  m = n.match(/DELETE\s+FROM\s+(\w+)/i);
  if (m) return m[1].toLowerCase();
  return null;
}

// ─── Main Query Executor ────────────────────────────────────────────────────

export async function memoryQuery(text, params = []) {
  const n = normalize(text).toUpperCase();

  if (n.startsWith('INSERT INTO')) return handleInsert(text, params);
  if (n.startsWith('SELECT'))      return handleSelect(text, params);
  if (n.startsWith('UPDATE'))      return handleUpdate(text, params);
  if (n.startsWith('DELETE'))      return handleDelete(text, params);

  return { rows: [], rowCount: 0 };
}

// ─── INSERT ─────────────────────────────────────────────────────────────────

function handleInsert(text, params) {
  const tableName = getTableName(text);
  if (!tableName || !tables[tableName]) return { rows: [], rowCount: 0 };

  const n = normalize(text);
  const colMatch = n.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
  if (!colMatch) return { rows: [], rowCount: 0 };

  const columns = colMatch[1].split(',').map(c => c.trim());
  const row = { id: uuidv4(), created_at: new Date(), updated_at: new Date() };

  columns.forEach((col, i) => {
    if (params[i] !== undefined) {
      row[col] = params[i];
    }
  });

  tables[tableName].push(row);
  return { rows: [row], rowCount: 1 };
}

// ─── SELECT ─────────────────────────────────────────────────────────────────

function handleSelect(text, params) {
  const n = normalize(text);

  // Handle SELECT NOW()
  if (n.toUpperCase().includes('SELECT NOW()')) {
    return { rows: [{ now: new Date() }], rowCount: 1 };
  }

  const tableName = getTableName(text);
  if (!tableName || !tables[tableName]) return { rows: [], rowCount: 0 };

  let results = [...tables[tableName]];

  // Apply WHERE filters
  results = applyWhere(n, results, params);

  // ORDER BY
  const orderMatch = n.match(/ORDER\s+BY\s+(\w+)\s*(DESC|ASC)?/i);
  if (orderMatch) {
    const col = orderMatch[1];
    const desc = (orderMatch[2] || '').toUpperCase() === 'DESC';
    results.sort((a, b) => {
      if (a[col] < b[col]) return desc ? 1 : -1;
      if (a[col] > b[col]) return desc ? -1 : 1;
      return 0;
    });
  }

  // LIMIT
  const limitMatch = n.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    results = results.slice(0, parseInt(limitMatch[1]));
  }

  return { rows: results, rowCount: results.length };
}

// ─── UPDATE ─────────────────────────────────────────────────────────────────

function handleUpdate(text, params) {
  const tableName = getTableName(text);
  if (!tableName || !tables[tableName]) return { rows: [], rowCount: 0 };

  const n = normalize(text);

  // Find WHERE condition
  const whereColMatch = n.match(/WHERE\s+(\w+)\s*=\s*\$(\d+)/i);
  if (!whereColMatch) return { rows: [], rowCount: 0 };

  const whereCol = whereColMatch[1];
  const whereVal = params[parseInt(whereColMatch[2]) - 1];

  // Parse SET clause — handle both `col = $N` and `col = NOW()`
  const setSection = n.match(/SET\s+(.+?)\s+WHERE/is);
  if (!setSection) return { rows: [], rowCount: 0 };

  const updates = {};
  // Split by comma but be careful with function calls
  const setParts = setSection[1].split(',');
  for (const part of setParts) {
    const paramSet = part.trim().match(/(\w+)\s*=\s*\$(\d+)/);
    if (paramSet) {
      updates[paramSet[1]] = params[parseInt(paramSet[2]) - 1];
      continue;
    }
    // Handle NOW() or CURRENT_TIMESTAMP
    const nowSet = part.trim().match(/(\w+)\s*=\s*NOW\(\)/i);
    if (nowSet) {
      updates[nowSet[1]] = new Date();
    }
  }
  updates.updated_at = new Date();

  let updated = [];
  tables[tableName] = tables[tableName].map(row => {
    if (String(row[whereCol]) === String(whereVal)) {
      const newRow = { ...row, ...updates };
      updated.push(newRow);
      return newRow;
    }
    return row;
  });

  return { rows: updated, rowCount: updated.length };
}

// ─── DELETE ─────────────────────────────────────────────────────────────────

function handleDelete(text, params) {
  const tableName = getTableName(text);
  if (!tableName || !tables[tableName]) return { rows: [], rowCount: 0 };

  const n = normalize(text);
  const whereMatch = n.match(/WHERE\s+(\w+)\s*=\s*\$(\d+)/i);
  if (!whereMatch) return { rows: [], rowCount: 0 };

  const col = whereMatch[1];
  const val = params[parseInt(whereMatch[2]) - 1];

  const deleted = tables[tableName].filter(row => String(row[col]) === String(val));
  tables[tableName] = tables[tableName].filter(row => String(row[col]) !== String(val));

  return { rows: deleted, rowCount: deleted.length };
}

// ─── WHERE Helper ───────────────────────────────────────────────────────────

function applyWhere(normalizedSql, rows, params) {
  const whereMatch = normalizedSql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s+GROUP|\s*$)/is);
  if (!whereMatch) return rows;

  const conditions = whereMatch[1].trim();

  // Handle OR conditions: col = $1 OR col = $2
  if (/\bOR\b/i.test(conditions)) {
    const orParts = conditions.split(/\s+OR\s+/i);
    return rows.filter(row => {
      return orParts.some(part => {
        const m = part.trim().match(/(\w+)\s*=\s*\$(\d+)/);
        if (m) {
          return String(row[m[1]]) === String(params[parseInt(m[2]) - 1]);
        }
        return false;
      });
    });
  }

  // Handle AND conditions (default): col1 = $1 AND col2 = $2
  const eqMatches = [...conditions.matchAll(/(\w+)\s*=\s*\$(\d+)/g)];
  let filtered = rows;
  for (const match of eqMatches) {
    const col = match[1];
    const val = params[parseInt(match[2]) - 1];
    filtered = filtered.filter(row => String(row[col]) === String(val));
  }

  return filtered;
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(tables, null, 2));
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      Object.assign(tables, data);
      return true;
    } catch (err) {
      console.error('Failed to load DB:', err);
      return false;
    }
  }
  return false;
}

// ─── Initialize ──────────────────────────────────────────────────────────────

export async function initMemoryDb() {
  if (loadDb()) {
    console.log('✅ Local database loaded from local_db.json');
    
    // Schema Migration for existing DB
    if (!tables.duels) tables.duels = [];
    if (!tables.duel_submissions) tables.duel_submissions = [];
    
    for (const u of tables.users) {
      if (u.elo_rating === undefined) {
        u.elo_rating = 1000;
        u.matches_played = 0;
        u.matches_won = 0;
        u.preferred_languages = ['javascript'];
      }
    }
    
    // Ensure rival user exists
    if (!tables.users.find(u => u.username === 'rival')) {
      const bcrypt = await import('bcryptjs');
      const { v4: uuidv4 } = await import('uuid');
      const hash = await bcrypt.default.hash('password123', 10);
      tables.users.push({
        id: uuidv4(),
        username: 'rival',
        email: 'rival@codesync.ai',
        password_hash: hash,
        avatar_url: null,
        elo_rating: 1200,
        matches_played: 10,
        matches_won: 6,
        preferred_languages: ['javascript', 'python'],
        created_at: new Date(),
        updated_at: new Date(),
        last_active_at: new Date(),
      });
      console.log('📝 Injected rival user into existing local DB');
    }
  } else {
    await seedDemoData();
    console.log('✅ Local database initialized with demo data');
  }
  
  saveDb();
  
  // Auto-save every 5 seconds to persist changes from direct array mutations
  setInterval(saveDb, 5000);
}

export { tables };
export default { query: memoryQuery, tables };
