/**
 * GET /api/tournaments
 * 直近試合をイベント（大会）ごとにグループ化して返す。
 * revalidate: 30分
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { detectRegion } from "@/lib/data";

export const revalidate = 1800;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

type TournamentMatch = {
  match_id: string;
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  winner: string;
  match_date: string;
};

type Tournament = {
  event: string;
  region: string;
  match_count: number;
  matches: TournamentMatch[];
};

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ tournaments: [] });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await sb
    .from("matches")
    .select("match_id, team1, team2, score1, score2, winner, event, match_date")
    .order("match_id", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ tournaments: [], error: error.message }, { status: 500 });
  }

  // イベント別にグループ化
  const grouped = new Map<string, TournamentMatch[]>();
  for (const m of data ?? []) {
    if (!m.event) continue;
    // 長いイベント名を正規化（例: "VCT 2025 Americas Kickoff Stage 1 Week 1" → "VCT 2025 Americas Kickoff"）
    const eventKey = m.event.replace(/\s+/g, " ").trim();
    if (!grouped.has(eventKey)) grouped.set(eventKey, []);
    grouped.get(eventKey)!.push({
      match_id: m.match_id,
      team1: m.team1,
      team2: m.team2,
      score1: m.score1,
      score2: m.score2,
      winner: m.winner,
      match_date: m.match_date,
    });
  }

  const tournaments: Tournament[] = Array.from(grouped.entries())
    .map(([event, matches]) => ({
      event,
      region: detectRegion(event),
      match_count: matches.length,
      matches: matches.slice(0, 5), // 最新5試合のみ
    }))
    .sort((a, b) => b.match_count - a.match_count)
    .slice(0, 20); // 上位20大会

  return NextResponse.json({ tournaments });
}
