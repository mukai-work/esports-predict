/**
 * GET /api/team-detail?team=X
 * チームの選手情報・最近の試合・マップ勝率を返す。
 * 並び順: match_id DESC（vlr.gg の match_id が大きいほど新しい試合）
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const DATA_DIR = path.join(process.cwd(), "..", "data", "matches");

type PlayerEntry = {
  name: string;
  agent: string;
  acs: number;
  adr: number;
  hs_pct: number;
  rating: number;
  matches: number;
};

async function getFromSupabase(team: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data } = await sb
    .from("matches")
    .select("match_id, team1, team2, score1, score2, winner, maps, players, event, team1_url, team2_url, match_date")
    .or(`team1.ilike.%${team}%,team2.ilike.%${team}%`)
    // match_id を整数として降順ソート（大きいほど新しい試合）
    .order("match_id", { ascending: false })
    .limit(30);

  return data ?? [];
}

function getFromLocal(team: string) {
  if (!fs.existsSync(DATA_DIR)) return [];
  const all = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf-8"));
      } catch {
        return null;
      }
    })
    .filter((m) => m && (
      m.team1?.toLowerCase().includes(team.toLowerCase()) ||
      m.team2?.toLowerCase().includes(team.toLowerCase())
    ));

  // match_id 降順（大きいほど新しい）
  all.sort((a: { match_id: string }, b: { match_id: string }) =>
    parseInt(b.match_id) - parseInt(a.match_id)
  );
  return all.slice(0, 30);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team") ?? "";
  if (!team) return NextResponse.json({ error: "team を指定してください" }, { status: 400 });

  const matches = (await getFromSupabase(team)) ?? getFromLocal(team);

  // 選手スタッツ集計
  const playerMap: Record<string, { acs: number[]; adr: number[]; hs_pct: number[]; rating: number[]; agents: string[] }> = {};

  for (const m of matches) {
    const players: Array<{
      team_idx: number; name: string; agent: string;
      acs: string; adr: string; hs_pct: string; rating: string;
    }> = m.players ?? [];
    const isTeam1 = m.team1?.toLowerCase().includes(team.toLowerCase());

    for (const p of players) {
      if ((isTeam1 && p.team_idx !== 0) || (!isTeam1 && p.team_idx !== 1)) continue;
      const name = p.name ?? "";
      if (!name) continue;

      if (!playerMap[name]) playerMap[name] = { acs: [], adr: [], hs_pct: [], rating: [], agents: [] };
      const acs = parseFloat(String(p.acs));
      const adr = parseFloat(String(p.adr));
      const hs = parseFloat(String(p.hs_pct));
      const rating = parseFloat(String(p.rating));
      if (!isNaN(acs) && acs > 0) playerMap[name].acs.push(acs);
      if (!isNaN(adr) && adr > 0) playerMap[name].adr.push(adr);
      if (!isNaN(hs) && hs > 0) playerMap[name].hs_pct.push(hs);
      if (!isNaN(rating) && rating > 0) playerMap[name].rating.push(rating);
      if (p.agent) playerMap[name].agents.push(p.agent);
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

  const players: PlayerEntry[] = Object.entries(playerMap)
    .map(([name, s]) => ({
      name,
      agent: mostUsed(s.agents),
      acs: avg(s.acs),
      adr: avg(s.adr),
      hs_pct: avg(s.hs_pct),
      rating: avg(s.rating),
      matches: s.acs.length,
    }))
    .filter((p) => p.matches >= 1)
    .sort((a, b) => b.acs - a.acs);

  // 直近5試合（match_id 降順で並んでいるのでそのまま slice）
  const recentMatches = matches.slice(0, 5).map((m) => {
    const isTeam1 = m.team1?.toLowerCase().includes(team.toLowerCase());
    return {
      match_id: m.match_id,
      opponent: isTeam1 ? m.team2 : m.team1,
      score: isTeam1
        ? `${m.score1}–${m.score2}`
        : `${m.score2}–${m.score1}`,
      won: m.winner?.toLowerCase().includes(team.toLowerCase()),
      event: m.event,
    };
  });

  // マップ勝率
  const mapRecord: Record<string, { wins: number; played: number }> = {};
  for (const m of matches) {
    const isTeam1 = m.team1?.toLowerCase().includes(team.toLowerCase());
    for (const mp of m.maps ?? []) {
      if (!mp.map) continue;
      const s1 = parseInt(mp.score1 ?? "0");
      const s2 = parseInt(mp.score2 ?? "0");
      const won = isTeam1 ? s1 > s2 : s2 > s1;
      if (!mapRecord[mp.map]) mapRecord[mp.map] = { wins: 0, played: 0 };
      mapRecord[mp.map].played++;
      if (won) mapRecord[mp.map].wins++;
    }
  }
  const mapStats = Object.entries(mapRecord)
    .map(([map, { wins, played }]) => ({
      map,
      win_rate: parseFloat((wins / played).toFixed(3)),
      played,
    }))
    .sort((a, b) => b.played - a.played)
    .slice(0, 7);

  // vlr.gg チームページ URL: matches から取得
  let teamVlrUrl = "";
  for (const m of matches) {
    const isTeam1 = m.team1?.toLowerCase().includes(team.toLowerCase());
    const url = isTeam1 ? m.team1_url : m.team2_url;
    if (url) { teamVlrUrl = url; break; }
  }

  return NextResponse.json({
    team,
    players,
    recent_matches: recentMatches,
    map_stats: mapStats,
    vlr_url: teamVlrUrl,  // Liquipedia → vlr.gg に変更
    total_matches: matches.length,
  });
}
