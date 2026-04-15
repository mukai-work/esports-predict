/**
 * GET /api/results?date=YYYY-MM-DD
 * 指定日（JST）の試合結果一覧を返す。
 * 各試合に AI 予想と的中/外れを付与する。
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchTeamStats, TeamStat } from "@/lib/data";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DATA_DIR = path.join(process.cwd(), "..", "data", "matches");

function calcWinProb(team1: string, team2: string, teams: TeamStat[]) {
  const find = (name: string) =>
    teams.find((t) => t.team.toLowerCase() === name.toLowerCase())?.win_rate ??
    teams.find((t) => t.team.toLowerCase().includes(name.toLowerCase()))?.win_rate ??
    0.5;
  const wr1 = find(team1);
  const wr2 = find(team2);
  const prob = parseFloat((1 / (1 + Math.exp(-(wr1 - wr2) * 5))).toFixed(3));
  return {
    team1_win_prob: prob,
    team2_win_prob: parseFloat((1 - prob).toFixed(3)),
    predicted_winner: prob >= 0.5 ? team1 : team2,
  };
}

async function getMatchesForDate(dateJST: string) {
  // dateJST = "2026-04-14"
  // JST の1日 = UTC の前日 15:00 〜 当日 15:00
  const start = new Date(dateJST + "T00:00:00+09:00").toISOString();
  const end = new Date(dateJST + "T23:59:59+09:00").toISOString();

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await sb
      .from("matches")
      .select("match_id, team1, team2, score1, score2, winner, event, maps, match_date, team1_url, team2_url")
      .gte("match_date", start)
      .lte("match_date", end)
      .order("match_id", { ascending: true });
    return data ?? [];
  }

  // ローカルフォールバック
  if (!fs.existsSync(DATA_DIR)) return [];
  const results = [];
  for (const f of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"))) {
    const m = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf-8"));
    const raw = m.date ?? m.match_date ?? "";
    if (!raw) continue;
    try {
      const dt = new Date(raw.replace(" ", "T") + (raw.includes("+") ? "" : "+00:00"));
      // JST 変換して日付比較
      const jstDate = new Date(dt.getTime() + 9 * 3600 * 1000);
      const jstStr = jstDate.toISOString().slice(0, 10);
      if (jstStr === dateJST) results.push(m);
    } catch { /* skip */ }
  }
  results.sort((a, b) => parseInt(a.match_id) - parseInt(b.match_id));
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date=YYYY-MM-DD を指定してください" }, { status: 400 });
  }

  const [rawMatches, teamStats] = await Promise.all([
    getMatchesForDate(date),
    fetchTeamStats(),
  ]);

  const matches = rawMatches.map((m) => {
    const pred = calcWinProb(m.team1, m.team2, teamStats);
    // 勝率差が ±5% 以内（45〜55%）は「拮抗」扱い → 的中/外れを判定しない
    const isTossup = Math.abs(pred.team1_win_prob - 0.5) < 0.05;
    const correct = isTossup
      ? null
      : m.winner &&
        ((pred.predicted_winner === m.team1 &&
          m.winner.toLowerCase().includes(m.team1.toLowerCase())) ||
          (pred.predicted_winner === m.team2 &&
            m.winner.toLowerCase().includes(m.team2.toLowerCase())));

    // 試合時刻を JST 文字列に変換
    let match_time_jst = "";
    try {
      const raw = m.match_date ?? m.date ?? "";
      if (raw) {
        const dt = new Date(raw.replace(" ", "T") + (raw.includes("+") ? "" : "+00:00"));
        const jst = new Date(dt.getTime() + 9 * 3600 * 1000);
        const hh = String(jst.getUTCHours()).padStart(2, "0");
        const mm = String(jst.getUTCMinutes()).padStart(2, "0");
        match_time_jst = `${hh}:${mm}`;
      }
    } catch { /* skip */ }

    return {
      match_id: m.match_id,
      team1: m.team1,
      team2: m.team2,
      score1: m.score1,
      score2: m.score2,
      winner: m.winner,
      event: m.event,
      maps: (m.maps ?? []).map((mp: { map: string; score1: string; score2: string }) => ({
        map: mp.map, score1: mp.score1, score2: mp.score2,
      })),
      team1_url: m.team1_url ?? "",
      team2_url: m.team2_url ?? "",
      match_time_jst,
      // AI 予想
      team1_win_prob: pred.team1_win_prob,
      team2_win_prob: pred.team2_win_prob,
      predicted_winner: pred.predicted_winner,
      prediction_correct: correct,
      is_tossup: isTossup,
    };
  });

  // 的中率
  const finished = matches.filter((m) => m.winner);
  const correct_count = finished.filter((m) => m.prediction_correct).length;

  return NextResponse.json({
    date,
    match_count: matches.length,
    correct_count,
    accuracy: finished.length > 0
      ? parseFloat((correct_count / finished.length).toFixed(3))
      : null,
    matches,
  });
}
