-- ============================================================================
-- CodeSync AI — Database Migration 001: Initial Schema
-- ============================================================================
-- Run this migration against your PostgreSQL database to create all tables,
-- indexes, and constraints needed by the CodeSync AI backend.
--
-- Usage: psql -d codesync -f migrations/001_init.sql
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(30) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    last_active_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users (last_active_at);

-- ─── PROJECTS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT DEFAULT '',
    language        VARCHAR(50) DEFAULT 'javascript',
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects (updated_at DESC);

-- ─── PROJECT COLLABORATORS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_collaborators (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'editor'
                    CHECK (role IN ('editor', 'viewer')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_project ON project_collaborators (project_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON project_collaborators (user_id);

-- ─── FILES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES files(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    path            TEXT NOT NULL,
    is_directory    BOOLEAN NOT NULL DEFAULT FALSE,
    content         TEXT DEFAULT '',
    language        VARCHAR(50) DEFAULT 'plaintext',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (project_id, path)
);

CREATE INDEX IF NOT EXISTS idx_files_project ON files (project_id);
CREATE INDEX IF NOT EXISTS idx_files_parent ON files (parent_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON files (project_id, path);

-- ─── AI CONVERSATIONS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id         UUID REFERENCES files(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_project ON ai_conversations (project_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_file ON ai_conversations (file_id);

-- ─── AI MESSAGES ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON ai_messages (conversation_id, created_at ASC);

-- ─── CHAT MESSAGES ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON chat_messages (project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages (project_id, created_at DESC);

-- ─── UPDATED_AT TRIGGER FUNCTION ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with updated_at
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'users', 'projects', 'project_collaborators', 'files', 'ai_conversations'
    ])
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON %I;
             CREATE TRIGGER trigger_update_%I_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW
             EXECUTE FUNCTION update_updated_at_column();',
            tbl, tbl, tbl, tbl
        );
    END LOOP;
END;
$$;

-- ============================================================================
-- Migration complete
-- ============================================================================
