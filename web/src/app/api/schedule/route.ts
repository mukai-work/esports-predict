/**
 * GET /api/schedule
 * vlr.gg から今後の試合を取得し、AI 予想を付けて返す。
 * 試合時刻は eta（残り時間）から逆算して JST（UTC+9）で返す。
 * revalidate: 600秒（10分）キャッシュ
 */
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchTeamStats, TeamStat, detectRegion } from "@/lib/data";

type ScheduleMatch = {
  match_id: string;
  team1: string;
  team2: string;
  match_time: string;      // JST 表示 "04/15 16:00" または "LIVE"
  match_time_raw: string;  // vlr.gg 原文 "4:00 PM"（デバッグ用）
  event: string;
  status: string;
  url: string;
  team1_win_prob: number;
  team2_win_prob: number;
  predicted_winner: string;
  region: string;
};

function calcWinProb(team: string, teams: TeamStat[]): number {
  const found =
    teams.find((t) => t.team.toLowerCase() === team.toLowerCase()) ??
    teams.find((t) => t.team.toLowerCase().includes(team.toLowerCase()));
  return found ? found.win_rate : 0.5;
}

/**
 * eta テキスト（"5h 20m", "45m", "1h" 等）から JST 時刻文字列を生成する。
 * vlr.gg が JS で変換する前の時刻はタイムゾーン不明なため、
 * 残り時間（eta）+ 現在 UTC から逆算するのが唯一の確実な方法。
 */
function etaToJST(etaText: string, nowUtc: Date): string {
  const upper = etaText.toUpperCase();
  if (upper.includes("LIVE")) return "LIVE";
  if (upper.includes("TBD")) return "TBD";

  const hoursMatch = etaText.match(/(\d+)h/);
  const minsMatch = etaText.match(/(\d+)m/);
  if (!hoursMatch && !minsMatch) return "";

  const totalMinutes =
    (hoursMatch ? parseInt(hoursMatch[1]) * 60 : 0) +
    (minsMatch ? parseInt(minsMatch[1]) : 0);

  const matchUtc = new Date(nowUtc.getTime() + totalMinutes * 60 * 1000);
  // JST = UTC + 9h
  const matchJst = new Date(matchUtc.getTime() + 9 * 60 * 60 * 1000);

  const mm = String(matchJst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(matchJst.getUTCDate()).padStart(2, "0");
  const hh = String(matchJst.getUTCHours()).padStart(2, "0");
  const min = String(matchJst.getUTCMinutes()).padStart(2, "0");

  return `${mm}/${dd} ${hh}:${min}`;
}

export async function GET() {
  try {
    const nowUtc = new Date();

    const res = await fetch("https://www.vlr.gg/matches", {
      headers: {
        "User-Agent": "esports-predict-research/1.0 (educational; contact via github)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 600 },
    });

    if (!res.ok) throw new Error(`vlr.gg fetch failed: ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const teamStats = await fetchTeamStats();

    const matches: ScheduleMatch[] = [];

    $("a.match-item").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const idMatch = href.match(/\/(\d+)\//);
      if (!idMatch) return;

      const teams = $(el).find(".match-item-vs-team-name")
        .map((_, t) => $(t).text().trim()).get();
      const team1 = teams[0] ?? "TBD";
      const team2 = teams[1] ?? "TBD";

      const rawTime = $(el).find(".match-item-time").text().trim();
      const event = $(el).find(".match-item-event").text().replace(/\s+/g, " ").trim();
      const etaText = $(el).find(".match-item-eta").text().trim();

      const upper = etaText.toUpperCase();
      const status = upper.includes("LIVE") ? "live"
        : upper.includes("TBD") ? "tbd"
        : "upcoming";

      // JST 変換
      const matchTimeJST = etaToJST(etaText, nowUtc);

      const wr1 = calcWinProb(team1, teamStats);
      const wr2 = calcWinProb(team2, teamStats);
      const diff = wr1 - wr2;
      const team1_win_prob = parseFloat((1 / (1 + Math.exp(-diff * 5))).toFixed(3));

      matches.push({
        match_id: idMatch[1],
        team1,
        team2,
        match_time: matchTimeJST || rawTime, // JST 取得失敗時は原文
        match_time_raw: rawTime,
        event,
        status,
        url: `https://www.vlr.gg${href}`,
        team1_win_prob,
        team2_win_prob: parseFloat((1 - team1_win_prob).toFixed(3)),
        predicted_winner: team1_win_prob >= 0.5 ? team1 : team2,
        region: detectRegion(event),
      });
    });

    return NextResponse.json({ matches });
  } catch (err) {
    console.error("[schedule]", err);
    return NextResponse.json({ error: "スケジュール取得に失敗しました", matches: [] }, { status: 500 });
  }
}
