/**
 * GET /api/players?limit=50&sort=acs
 * 全試合データから選手スタッツを集計してランキングを返す。
 * sort: acs | adr | hs_pct
 * revalidate: 30分
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 1800;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

type PlayerStat = {
  name: string;
  team: string;
  agent: string;
  avg_acs: number;
  avg_adr: number;
  avg_hs_pct: number;
  avg_rating: number;
  matches: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = (searchParams.get("sort") ?? "acs") as "acs" | "adr" | "hs_pct";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const minMatches = parseInt(searchParams.get("min_matches") ?? "3");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ players: [] });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await sb
    .from("matches")
    .select("team1, team2, players")
    .not("players", "is", null)
    .limit(500);

  if (error) {
    return NextResponse.json({ players: [], error: error.message }, { status: 500 });
  }

  // 選手ごとにスタッツを集計
  const playerMap = new Map<
    string,
    { team: string; acs: number[]; adr: number[]; hs_pct: number[]; rating: number[]; agents: string[] }
  >();

  for (const match of data ?? []) {
    const players = match.players as Array<{
      team_idx: number; name: string; agent: string;
      acs: string | number; adr: string | number; hs_pct: string | number; rating: string | number;
    }> | null;
    if (!players) continue;

    for (const p of players) {
      const name = p.name?.trim();
      if (!name) continue;
      const team = p.team_idx === 0 ? match.team1 : match.team2;
      const acs = parseFloat(String(p.acs));
      const adr = parseFloat(String(p.adr));
      const hs = parseFloat(String(p.hs_pct));
      const rating = parseFloat(String(p.rating));

      if (!playerMap.has(name)) {
        playerMap.set(name, { team, acs: [], adr: [], hs_pct: [], rating: [], agents: [] });
      }
      const entry = playerMap.get(name)!;
      // チーム名は最新のもので上書き
      entry.team = team;
      if (!isNaN(acs) && acs > 0 && acs < 500) entry.acs.push(acs);
      if (!isNaN(adr) && adr > 0 && adr < 300) entry.adr.push(adr);
      if (!isNaN(hs) && hs >= 0 && hs <= 100) entry.hs_pct.push(hs);
      if (!isNaN(rating) && rating > 0 && rating < 5) entry.rating.push(rating);
      if (p.agent) entry.agents.push(p.agent);
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;
  const mostUsed = (arr: string[]) => {
    if (!arr.length) return "";
    const freq: Record<string, number> = {};
    arr.forEach((a) => (freq[a] = (freq[a] ?? 0) + 1));
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  };

  const players: PlayerStat[] = Array.from(playerMap.entries())
    .map(([name, s]) => ({
      name,
      team: s.team,
      agent: mostUsed(s.agents),
      avg_acs: avg(s.acs),
      avg_adr: avg(s.adr),
      avg_hs_pct: avg(s.hs_pct),
      avg_rating: avg(s.rating),
      matches: Math.max(s.acs.length, s.adr.length, 1),
    }))
    .filter((p) => p.matches >= minMatches && p.avg_acs > 0);

  // ソート
  const sortKey: Record<"acs" | "adr" | "hs_pct", keyof PlayerStat> = {
    acs: "avg_acs",
    adr: "avg_adr",
    hs_pct: "avg_hs_pct",
  };
  players.sort((a, b) => (b[sortKey[sortBy]] as number) - (a[sortKey[sortBy]] as number));

  return NextResponse.json({ players: players.slice(0, limit), total: players.length });
}
