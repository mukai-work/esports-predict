-- eスポーツ AI予想サービス Supabase スキーマ
-- Supabase SQL Editor (https://supabase.com/dashboard/project/udorprwbgfhagtvscoxa/sql/new) で実行する

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
CREATE INDEX IF NOT EXISTS idx_matches_team1    ON matches(team1);
CREATE INDEX IF NOT EXISTS idx_matches_team2    ON matches(team2);
CREATE INDEX IF NOT EXISTS idx_matches_created  ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_stats_wr    ON team_stats(win_rate DESC);

-- RLS 有効化
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches     ENABLE ROW LEVEL SECURITY;

-- 読み取り: 全員許可
CREATE POLICY "public_read_team_stats" ON team_stats FOR SELECT USING (true);
CREATE POLICY "public_read_matches"    ON matches     FOR SELECT USING (true);

-- 書き込み: anon も許可（Phase1 MVP - データはすべて公開情報）
CREATE POLICY "anon_insert_team_stats"  ON team_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_team_stats"  ON team_stats FOR UPDATE USING (true);
CREATE POLICY "anon_insert_matches"     ON matches     FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_matches"     ON matches     FOR UPDATE USING (true);
