/**
 * GET /api/map-predict?team1=X&team2=Y
 * 過去の試合データからマップ別の出現頻度・勝率を返す。
 */
import { NextResponse } from "next/server";
import { fetchRecentMatches } from "@/lib/data";

type MapStat = {
  map: string;
  team1_played: number;
  team1_wins: number;
  team1_win_rate: number;
  team2_played: number;
  team2_wins: number;
  team2_win_rate: number;
  predicted_winner: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get("team1") ?? "";
  const team2 = searchParams.get("team2") ?? "";

  if (!team1 || !team2) {
    return NextResponse.json({ error: "team1 と team2 を指定してください" }, { status: 400 });
  }

  // 全試合から両チームが絡む試合を抽出
  const allMatches = await fetchRecentMatches(500);

  type MapRecord = { played: number; wins: number };
  const statsMap: Record<string, { t1: MapRecord; t2: MapRecord }> = {};

  function addStat(team: string, mapName: string, win: boolean, side: "t1" | "t2") {
    if (!statsMap[mapName]) {
      statsMap[mapName] = { t1: { played: 0, wins: 0 }, t2: { played: 0, wins: 0 } };
    }
    statsMap[mapName][side].played++;
    if (win) statsMap[mapName][side].wins++;
  }

  for (const m of allMatches) {
    const isTeam1 = (name: string) =>
      name.toLowerCase() === team1.toLowerCase() ||
      name.toLowerCase().includes(team1.toLowerCase());
    const isTeam2 = (name: string) =>
      name.toLowerCase() === team2.toLowerCase() ||
      name.toLowerCase().includes(team2.toLowerCase());

    const t1isTeam1 = isTeam1(m.team1);
    const t1isTeam2 = isTeam2(m.team1);
    const t2isTeam1 = isTeam1(m.team2);
    const t2isTeam2 = isTeam2(m.team2);

    for (const mp of m.maps) {
      const mapName = mp.map;
      if (!mapName) continue;
      const s1 = parseInt(mp.score1 ?? "0");
      const s2 = parseInt(mp.score2 ?? "0");

      if (t1isTeam1) addStat(m.team1, mapName, s1 > s2, "t1");
      if (t2isTeam1) addStat(m.team2, mapName, s2 > s1, "t1");
      if (t1isTeam2) addStat(m.team1, mapName, s1 > s2, "t2");
      if (t2isTeam2) addStat(m.team2, mapName, s2 > s1, "t2");
    }
  }

  const result: MapStat[] = Object.entries(statsMap)
    .filter(([, v]) => v.t1.played > 0 || v.t2.played > 0)
    .map(([map, v]) => {
      const t1wr = v.t1.played > 0 ? v.t1.wins / v.t1.played : 0.5;
      const t2wr = v.t2.played > 0 ? v.t2.wins / v.t2.played : 0.5;
      return {
        map,
        team1_played: v.t1.played,
        team1_wins: v.t1.wins,
        team1_win_rate: parseFloat(t1wr.toFixed(3)),
        team2_played: v.t2.played,
        team2_wins: v.t2.wins,
        team2_win_rate: parseFloat(t2wr.toFixed(3)),
        predicted_winner:
          v.t1.played === 0 && v.t2.played === 0
            ? null
            : t1wr >= t2wr
            ? team1
            : team2,
      };
    })
    .sort((a, b) => b.team1_played + b.team2_played - (a.team1_played + a.team2_played));

  return NextResponse.json({ team1, team2, maps: result });
}
