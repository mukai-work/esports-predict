/**
 * GET /api/accuracy-trend?days=7
 * 直近 N 日間の AI 予想的中率トレンドを返す。
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchTeamStats, TeamStat } from "@/lib/data";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function calcWinProb(team1: string, team2: string, teams: TeamStat[]) {
  const find = (name: string) =>
    teams.find((t) => t.team.toLowerCase() === name.toLowerCase())?.win_rate ??
    teams.find((t) => t.team.toLowerCase().includes(name.toLowerCase()))?.win_rate ??
    0.5;
  const wr1 = find(team1);
  const wr2 = find(team2);
  const prob = 1 / (1 + Math.exp(-(wr1 - wr2) * 5));
  return { prob, predicted_winner: prob >= 0.5 ? team1 : team2 };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "7"), 14);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ trend: [] });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const teamStats = await fetchTeamStats();

  // 直近 N 日の日付を生成（JST）
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600 * 1000);

  const trend = [];

  for (let i = days - 1; i >= 0; i--) {
    const target = new Date(jstNow.getTime() - i * 24 * 3600 * 1000);
    const yyyy = target.getUTCFullYear();
    const mm = String(target.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(target.getUTCDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const start = new Date(dateStr + "T00:00:00+09:00").toISOString();
    const end = new Date(dateStr + "T23:59:59+09:00").toISOString();

    const { data } = await sb
      .from("matches")
      .select("team1, team2, winner, team1_win_prob:score1")
      .gte("match_date", start)
      .lte("match_date", end);

    if (!data || data.length === 0) {
      trend.push({ date: dateStr, accuracy: null, correct: 0, total: 0 });
      continue;
    }

    let correct = 0;
    let judged = 0;

    for (const m of data) {
      if (!m.winner) continue;
      const { prob, predicted_winner } = calcWinProb(m.team1, m.team2, teamStats);
      if (Math.abs(prob - 0.5) < 0.05) continue; // 拮抗除外
      judged++;
      const won =
        (predicted_winner === m.team1 && m.winner.toLowerCase().includes(m.team1.toLowerCase())) ||
        (predicted_winner === m.team2 && m.winner.toLowerCase().includes(m.team2.toLowerCase()));
      if (won) correct++;
    }

    trend.push({
      date: dateStr,
      accuracy: judged > 0 ? parseFloat((correct / judged).toFixed(3)) : null,
      correct,
      total: judged,
    });
  }

  const overall_correct = trend.reduce((s, d) => s + d.correct, 0);
  const overall_total = trend.reduce((s, d) => s + d.total, 0);

  return NextResponse.json({
    trend,
    overall_accuracy: overall_total > 0
      ? parseFloat((overall_correct / overall_total).toFixed(3))
      : null,
    overall_correct,
    overall_total,
  });
}
