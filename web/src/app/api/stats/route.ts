/**
 * GET /api/stats
 * サービス全体の統計サマリーを返す。
 * - 総試合数、総チーム数、直近7日の的中率
 * revalidate: 1時間
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchTeamStats, TeamStat } from "@/lib/data";

export const revalidate = 3600;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function calcWinProb(team1: string, team2: string, teams: TeamStat[]) {
  const find = (name: string) =>
    teams.find((t) => t.team.toLowerCase() === name.toLowerCase())?.win_rate ??
    teams.find((t) => t.team.toLowerCase().includes(name.toLowerCase()))?.win_rate ??
    0.5;
  const wr1 = find(team1);
  const wr2 = find(team2);
  return 1 / (1 + Math.exp(-(wr1 - wr2) * 5));
}

export async function GET() {
  const teamStats = await fetchTeamStats();
  const teamCount = teamStats.length;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({
      match_count: 0,
      team_count: teamCount,
      accuracy_7d: null,
      correct_7d: 0,
      total_7d: 0,
    });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 総試合数
  const { count: matchCount } = await sb
    .from("matches")
    .select("*", { count: "exact", head: true });

  // 直近7日のJST開始時刻
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600 * 1000);
  const sevenDaysAgo = new Date(jstNow.getTime() - 7 * 24 * 3600 * 1000);
  const startISO = new Date(
    sevenDaysAgo.getUTCFullYear(),
    sevenDaysAgo.getUTCMonth(),
    sevenDaysAgo.getUTCDate()
  ).toISOString();

  const { data: recentMatches } = await sb
    .from("matches")
    .select("team1, team2, winner")
    .gte("match_date", startISO)
    .not("winner", "is", null);

  let correct7d = 0;
  let total7d = 0;
  for (const m of recentMatches ?? []) {
    if (!m.winner) continue;
    const prob = calcWinProb(m.team1, m.team2, teamStats);
    if (Math.abs(prob - 0.5) < 0.05) continue;
    const predicted = prob >= 0.5 ? m.team1 : m.team2;
    total7d++;
    if (m.winner.toLowerCase().includes(predicted.toLowerCase())) correct7d++;
  }

  return NextResponse.json({
    match_count: matchCount ?? 0,
    team_count: teamCount,
    accuracy_7d: total7d > 0 ? parseFloat((correct7d / total7d).toFixed(3)) : null,
    correct_7d: correct7d,
    total_7d: total7d,
  });
}
