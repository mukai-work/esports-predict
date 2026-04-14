/**
 * GET /api/schedule
 * vlr.gg から今後の試合を取得し、AI 予想を付けて返す。
 * revalidate: 600秒（10分）キャッシュ
 */
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchTeamStats, TeamStat, detectRegion } from "@/lib/data";

type ScheduleMatch = {
  match_id: string;
  team1: string;
  team2: string;
  match_time: string;
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

export async function GET() {
  try {
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

      const matchTime = $(el).find(".match-item-time").text().trim();
      const event = $(el).find(".match-item-event").text().replace(/\s+/g, " ").trim();

      const etaText = $(el).find(".match-item-eta").text().trim().toUpperCase();
      const status = etaText.includes("LIVE")
        ? "live"
        : etaText.includes("TBD")
        ? "tbd"
        : "upcoming";

      const wr1 = calcWinProb(team1, teamStats);
      const wr2 = calcWinProb(team2, teamStats);
      const diff = wr1 - wr2;
      const team1_win_prob = parseFloat((1 / (1 + Math.exp(-diff * 5))).toFixed(3));

      matches.push({
        match_id: idMatch[1],
        team1,
        team2,
        match_time: matchTime,
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
