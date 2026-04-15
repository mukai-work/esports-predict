import { NextResponse } from "next/server";
import { fetchTeamStats, fetchRecentMatches, detectRegion, TeamStat } from "@/lib/data";

type MatchRecord = Awaited<ReturnType<typeof fetchRecentMatches>>[number];

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

function computeH2H(
  team1: string,
  team2: string,
  matches: MatchRecord[]
): { rate: number; total: number } {
  const relevant = matches.filter(
    (m) =>
      (m.team1.toLowerCase().includes(team1.toLowerCase()) || m.team2.toLowerCase().includes(team1.toLowerCase())) &&
      (m.team1.toLowerCase().includes(team2.toLowerCase()) || m.team2.toLowerCase().includes(team2.toLowerCase()))
  );

  if (relevant.length === 0) return { rate: 0.5, total: 0 };

  const t1wins = relevant.filter((m) => {
    const t1isTeam1 = m.team1.toLowerCase().includes(team1.toLowerCase());
    return t1isTeam1 ? m.winner === m.team1 : m.winner === m.team2;
  }).length;

  return { rate: t1wins / relevant.length, total: relevant.length };
}

function computeMapStats(
  team: string,
  matches: MatchRecord[]
): { map: string; win_rate: number; played: number }[] {
  const mapRecord: Record<string, { wins: number; played: number }> = {};

  for (const m of matches) {
    const isTeam1 = m.team1.toLowerCase().includes(team.toLowerCase());
    const isTeam2 = m.team2.toLowerCase().includes(team.toLowerCase());
    if (!isTeam1 && !isTeam2) continue;

    for (const mp of m.maps) {
      if (!mp.map) continue;
      const s1 = parseInt(mp.score1 ?? "0");
      const s2 = parseInt(mp.score2 ?? "0");
      const won = isTeam1 ? s1 > s2 : s2 > s1;
      if (!mapRecord[mp.map]) mapRecord[mp.map] = { wins: 0, played: 0 };
      mapRecord[mp.map].played++;
      if (won) mapRecord[mp.map].wins++;
    }
  }

  return Object.entries(mapRecord)
    .map(([map, { wins, played }]) => ({
      map,
      win_rate: played > 0 ? parseFloat((wins / played).toFixed(3)) : 0.5,
      played,
    }))
    .sort((a, b) => b.played - a.played)
    .slice(0, 6);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get("team1");
  const team2 = searchParams.get("team2");

  if (!team1 || !team2) {
    return NextResponse.json({ error: "team1 と team2 を指定してください" }, { status: 400 });
  }

  const [teams, allMatches] = await Promise.all([
    fetchTeamStats(),
    fetchRecentMatches(500),
  ]);

  if (teams.length === 0) {
    return NextResponse.json({ error: "データ未収集" }, { status: 503 });
  }

  const s1 = getStats(team1, teams);
  const s2 = getStats(team2, teams);

  // head-to-head
  const h2h = computeH2H(team1, team2, allMatches);

  // 勝率計算: h2h があれば重み付き、なければシグモイド
  let team1_win_prob: number;
  if (h2h.total >= 2) {
    // h2h データが2試合以上: 60% h2h + 40% 通算勝率
    const sigmoid_prob = 1 / (1 + Math.exp(-(s1.win_rate - s2.win_rate) * 5));
    team1_win_prob = 0.6 * h2h.rate + 0.4 * sigmoid_prob;
  } else if (h2h.total === 1) {
    // h2h 1試合: 30% h2h + 70% 通算勝率
    const sigmoid_prob = 1 / (1 + Math.exp(-(s1.win_rate - s2.win_rate) * 5));
    team1_win_prob = 0.3 * h2h.rate + 0.7 * sigmoid_prob;
  } else {
    team1_win_prob = 1 / (1 + Math.exp(-(s1.win_rate - s2.win_rate) * 5));
  }
  team1_win_prob = parseFloat(team1_win_prob.toFixed(3));

  // マップ別勝率
  const t1MapStats = computeMapStats(team1, allMatches);
  const t2MapStats = computeMapStats(team2, allMatches);

  // 信頼度スコア（0〜100: データが多いほど高い）
  const confidence = Math.min(
    100,
    Math.round(
      (Math.min(s1.matches, 10) / 10) * 40 +   // team1 試合数 (max 40pt)
      (Math.min(s2.matches, 10) / 10) * 40 +   // team2 試合数 (max 40pt)
      (Math.min(h2h.total, 3) / 3) * 20         // h2h 試合数 (max 20pt)
    )
  );

  return NextResponse.json({
    team1,
    team2,
    team1_win_prob,
    team2_win_prob: parseFloat((1 - team1_win_prob).toFixed(3)),
    predicted_winner: team1_win_prob >= 0.5 ? team1 : team2,
    confidence,
    team1_stats: s1,
    team2_stats: s2,
    h2h: {
      total: h2h.total,
      team1_wins: Math.round(h2h.rate * h2h.total),
      team2_wins: Math.round((1 - h2h.rate) * h2h.total),
      team1_rate: parseFloat(h2h.rate.toFixed(3)),
    },
    team1_map_stats: t1MapStats,
    team2_map_stats: t2MapStats,
    note: s1.matches === 0 || s2.matches === 0
      ? "一方または両チームのデータが不足しています"
      : null,
  });
}
