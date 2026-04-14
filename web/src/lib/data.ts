/**
 * データ取得の共通レイヤー
 * - SUPABASE_URL が設定されていれば Supabase から取得
 * - なければローカルファイルから取得（開発時）
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DATA_DIR = path.join(process.cwd(), "..", "data");

export type TeamStat = {
  team: string;
  matches: number;
  wins: number;
  losses: number;
  win_rate: number;
};

export type MatchRecord = {
  match_id: string;
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  winner: string;
  event: string;
  map_count: number;
  maps: { map: string; score1: string; score2: string }[];
};

function useSupabase() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getSupabase() {
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}

// ─── チーム統計 ──────────────────────────────────────────────────────────────

export async function fetchTeamStats(): Promise<TeamStat[]> {
  if (useSupabase()) {
    const { data, error } = await getSupabase()
      .from("team_stats")
      .select("*")
      .order("win_rate", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      team: r.team,
      matches: Number(r.matches),
      wins: Number(r.wins),
      losses: Number(r.losses),
      win_rate: Number(r.win_rate),
    }));
  }

  // ローカルファイル（開発時）
  const csvPath = path.join(DATA_DIR, "processed", "team_stats.csv");
  if (!fs.existsSync(csvPath)) return [];
  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  return rows.map((r) => ({
    team: r.team,
    matches: Number(r.matches),
    wins: Number(r.wins),
    losses: Number(r.losses),
    win_rate: Number(r.win_rate),
  }));
}

// ─── 試合結果 ────────────────────────────────────────────────────────────────

export function detectRegion(event: string): string {
  const e = event.toUpperCase();
  if (/AMERICAS|NORTH AMERICA|\bNA\b|BRAZIL|LATIN/.test(e)) return "Americas";
  if (/EMEA|EUROPE|TURKEY|SPAIN|GERMANY|FRANCE|BENELUX|NORDIC|DACH|\bUK\b/.test(e)) return "EMEA";
  if (/PACIFIC|APAC|JAPAN|KOREA|\bSEA\b|OCEANIA|SOUTH ASIA/.test(e)) return "Pacific";
  if (/CHINA|\bCN\b|BILIBILI/.test(e)) return "China";
  return "Other";
}

export async function fetchRecentMatches(limit = 20, region?: string): Promise<MatchRecord[]> {
  if (useSupabase()) {
    let query = getSupabase()
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    // region フィルタは Python 側で付与されるまでクライアント側でフィルタ
    const { data, error } = await query;
    if (error) throw error;
    const records = (data ?? []).map((r) => ({
      match_id: r.match_id,
      team1: r.team1,
      team2: r.team2,
      score1: r.score1,
      score2: r.score2,
      winner: r.winner,
      event: r.event,
      map_count: r.map_count,
      maps: r.maps ?? [],
    }));
    return region
      ? records.filter((m) => detectRegion(m.event) === region)
      : records;
  }

  // ローカルファイル（開発時）
  const matchesDir = path.join(DATA_DIR, "matches");
  if (!fs.existsSync(matchesDir)) return [];
  const files = fs
    .readdirSync(matchesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(matchesDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit);

  return files.map(({ name }) => {
    const m = JSON.parse(fs.readFileSync(path.join(matchesDir, name), "utf-8"));
    return {
      match_id: m.match_id,
      team1: m.team1,
      team2: m.team2,
      score1: m.score1,
      score2: m.score2,
      winner: m.winner,
      event: m.event,
      map_count: (m.maps ?? []).length,
      maps: (m.maps ?? []).map((mp: { map: string; score1: string; score2: string }) => ({
        map: mp.map, score1: mp.score1, score2: mp.score2,
      })),
    };
  });
}
