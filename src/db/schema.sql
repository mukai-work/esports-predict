-- eスポーツ AI予想サービス Supabase スキーマ
-- Supabase SQL Editor で実行する

-- チーム統計テーブル
CREATE TABLE IF NOT EXISTS team_stats (
  id         SERIAL PRIMARY KEY,
  team       TEXT NOT NULL UNIQUE,
  matches    INTEGER NOT NULL DEFAULT 0,
  wins       INTEGER NOT NULL DEFAULT 0,
  losses     INTEGER NOT NULL DEFAULT 0,
  win_rate   REAL NOT NULL DEFAULT 0.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 試合結果テーブル
CREATE TABLE IF NOT EXISTS matches (
  match_id   TEXT PRIMARY KEY,
  team1      TEXT NOT NULL,
  team2      TEXT NOT NULL,
  score1     TEXT,
  score2     TEXT,
  winner     TEXT,
  event      TEXT,
  map_count  INTEGER DEFAULT 0,
  maps       JSONB DEFAULT '[]',
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_matches_team1 ON matches(team1);
CREATE INDEX IF NOT EXISTS idx_matches_team2 ON matches(team2);
CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_stats_win_rate ON team_stats(win_rate DESC);

-- RLS（Row Level Security）: 読み取りは全員許可、書き込みはサービスキーのみ
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read team_stats" ON team_stats FOR SELECT USING (true);
CREATE POLICY "Public read matches"    ON matches     FOR SELECT USING (true);
