import { NextResponse } from "next/server";
import { fetchTeamStats, TeamStat } from "@/lib/data";

function getStats(name: string, teams: TeamStat[]) {
  const found =
    teams.find((t) => t.team.toLowerCase() === name.toLowerCase()) ??
    teams.find((t) => t.team.toLowerCase().includes(name.toLowerCase()));
  if (!found) return { win_rate: 0.5, matches: 0, wins: 0, losses: 0 };
  return {
    win_rate: found.win_rate,
    matches: found.matches,
    wins: found.wins,
    losses: found.losses,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get("team1");
  const team2 = searchParams.get("team2");

  if (!team1 || !team2) {
    return NextResponse.json({ error: "team1 と team2 を指定してください" }, { status: 400 });
  }

  const teams = await fetchTeamStats();
  if (teams.length === 0) {
    return NextResponse.json({ error: "データ未収集" }, { status: 503 });
  }

  const s1 = getStats(team1, teams);
  const s2 = getStats(team2, teams);

  // 勝率差をシグモイド変換して確率に
  const diff = s1.win_rate - s2.win_rate;
  const team1_win_prob = parseFloat((1 / (1 + Math.exp(-diff * 5))).toFixed(3));
  const team2_win_prob = parseFloat((1 - team1_win_prob).toFixed(3));

  return NextResponse.json({
    team1,
    team2,
    team1_win_prob,
    team2_win_prob,
    predicted_winner: team1_win_prob >= 0.5 ? team1 : team2,
    team1_stats: s1,
    team2_stats: s2,
    note:
      s1.matches === 0 || s2.matches === 0
        ? "一方または両チームのデータが不足しています（初期値 50% を使用）"
        : null,
  });
}
