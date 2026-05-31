-- ============================================================================
-- CodeSync AI — Database Migration 002: Duel System
-- ============================================================================
-- Adds elo_rating, matches_played, matches_won, preferred_languages to users,
-- and creates duels + duel_submissions tables.
-- Safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ============================================================================

-- ─── Add duel columns to users table ────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'elo_rating') THEN
        ALTER TABLE users ADD COLUMN elo_rating INTEGER NOT NULL DEFAULT 1000;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'matches_played') THEN
        ALTER TABLE users ADD COLUMN matches_played INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'matches_won') THEN
        ALTER TABLE users ADD COLUMN matches_won INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'preferred_languages') THEN
        ALTER TABLE users ADD COLUMN preferred_languages TEXT DEFAULT '["javascript"]';
    END IF;
END
$$;

-- ─── DUELS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS duels (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player1_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player2_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode            VARCHAR(20) NOT NULL DEFAULT '1q',
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'cancelled')),
    winner_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    player1_score   INTEGER DEFAULT 0,
    player2_score   INTEGER DEFAULT 0,
    problems        JSONB DEFAULT '[]',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_duels_player1 ON duels (player1_id);
CREATE INDEX IF NOT EXISTS idx_duels_player2 ON duels (player2_id);
CREATE INDEX IF NOT EXISTS idx_duels_status ON duels (status);

-- ─── DUEL SUBMISSIONS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS duel_submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    duel_id         UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_index   INTEGER NOT NULL DEFAULT 0,
    language        VARCHAR(50) NOT NULL DEFAULT 'javascript',
    code            TEXT NOT NULL DEFAULT '',
    passed          BOOLEAN DEFAULT FALSE,
    score           INTEGER DEFAULT 0,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_duel_submissions_duel ON duel_submissions (duel_id);
CREATE INDEX IF NOT EXISTS idx_duel_submissions_user ON duel_submissions (user_id);

-- ============================================================================
-- Migration 002 complete
-- ============================================================================
