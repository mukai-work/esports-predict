/**
 * GET /api/match?id=648110
 * 試合詳細（マップ別スコア・選手スタッツ・AI予想）を返す。
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchTeamStats } from "@/lib/data";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DATA_DIR = path.join(process.cwd(), "..", "data", "matches");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id を指定してください" }, { status: 400 });

  let match: Record<string, unknown> | null = null;

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await sb.from("matches").select("*").eq("match_id", id).limit(1);
    if (!error && data && data.length > 0) match = data[0];
  }

  if (!match) {
    const local = path.join(DATA_DIR, `${id}.json`);
    if (fs.existsSync(local)) {
      match = JSON.parse(fs.readFileSync(local, "utf-8"));
    }
  }

  if (!match) return NextResponse.json({ error: "試合が見つかりません" }, { status: 404 });

  // AI 予想を付与
  const teamStats = await fetchTeamStats();
  const find = (name: string) =>
    teamStats.find((t) => t.team.toLowerCase() === (name as string).toLowerCase())?.win_rate ??
    teamStats.find((t) => t.team.toLowerCase().includes((name as string).toLowerCase()))?.win_rate ??
    0.5;

  const wr1 = find(match.team1 as string);
  const wr2 = find(match.team2 as string);
  const prob = parseFloat((1 / (1 + Math.exp(-(wr1 - wr2) * 5))).toFixed(3));
  const isTossup = Math.abs(prob - 0.5) < 0.05;

  // JST 時刻
  let match_time_jst = "";
  const raw = (match.match_date ?? match.date ?? "") as string;
  if (raw) {
    try {
      const dt = new Date(raw.replace(" ", "T") + (raw.includes("+") ? "" : "+00:00"));
      const jst = new Date(dt.getTime() + 9 * 3600 * 1000);
      const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(jst.getUTCDate()).padStart(2, "0");
      const hh = String(jst.getUTCHours()).padStart(2, "0");
      const min = String(jst.getUTCMinutes()).padStart(2, "0");
      match_time_jst = `${mm}/${dd} ${hh}:${min} JST`;
    } catch { /* skip */ }
  }

  return NextResponse.json({
    ...match,
    match_time_jst,
    team1_win_prob: prob,
    team2_win_prob: parseFloat((1 - prob).toFixed(3)),
    predicted_winner: prob >= 0.5 ? match.team1 : match.team2,
    is_tossup: isTossup,
  });
}
