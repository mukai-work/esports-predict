/**
 * GET /api/cron/refresh
 * Vercel Cron Job から 6時間毎に呼び出されるデータ更新エンドポイント。
 * vlr.gg の最新結果を取得し、Supabase に新規試合を挿入、チーム統計を再計算する。
 *
 * セキュリティ: Authorization: Bearer <CRON_SECRET> ヘッダーで認証
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

interface RawMatch {
  match_id: string;
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  winner: string;
  event: string;
  url: string;
}

async function scrapeRecentResults(pages = 3): Promise<RawMatch[]> {
  const results: RawMatch[] = [];

  for (let page = 1; page <= pages; page++) {
    const url =
      page === 1
        ? "https://www.vlr.gg/matches/results/"
        : `https://www.vlr.gg/matches/results/?page=${page}`;

    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "esports-predict-research/1.0 (educational; contact via github)",
          "Accept-Language": "en-US,en;q=0.9",
        },
        next: { revalidate: 0 }, // 常に最新を取得
      });
      if (!res.ok) break;
      html = await res.text();
    } catch {
      break;
    }

    const $ = cheerio.load(html);

    $("a.match-item").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const idMatch = href.match(/\/(\d+)\//);
      if (!idMatch) return;

      const teams = $(el)
        .find(".match-item-vs-team-name")
        .map((_, t) => $(t).text().trim())
        .get();
      const scores = $(el)
        .find(".match-item-vs-team-score")
        .map((_, s) => $(s).text().trim())
        .get();
      const event = $(el)
        .find(".match-item-event")
        .text()
        .replace(/\s+/g, " ")
        .trim();

      const team1 = teams[0] ?? "";
      const team2 = teams[1] ?? "";
      const score1 = scores[0] ?? "";
      const score2 = scores[1] ?? "";

      if (!team1 || !team2) return;

      // 勝者判定（スコアが数値のとき）
      const s1 = parseInt(score1);
      const s2 = parseInt(score2);
      const winner =
        !isNaN(s1) && !isNaN(s2) ? (s1 > s2 ? team1 : team2) : "";

      results.push({
        match_id: idMatch[1],
        team1,
        team2,
        score1,
        score2,
        winner,
        event,
        url: `https://www.vlr.gg${href}`,
      });
    });

    // vlr.gg に優しいウェイト（0.8秒）
    if (page < pages) await new Promise((r) => setTimeout(r, 800));
  }

  return results;
}

async function upsertMatchesAndStats(matches: RawMatch[]) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase 未設定");
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 既存の match_id を取得
  const { data: existing } = await sb
    .from("matches")
    .select("match_id")
    .in(
      "match_id",
      matches.map((m) => m.match_id)
    );
  const existingIds = new Set((existing ?? []).map((r: { match_id: string }) => r.match_id));

  // 新規試合のみ挿入
  const newMatches = matches.filter((m) => !existingIds.has(m.match_id));
  let inserted = 0;

  if (newMatches.length > 0) {
    const rows = newMatches.map((m) => ({
      match_id: m.match_id,
      team1: m.team1,
      team2: m.team2,
      score1: m.score1,
      score2: m.score2,
      winner: m.winner,
      event: m.event,
      maps: [],
      map_count: 0,
      match_date: new Date().toISOString(), // 正確な日時は detail から取得できないため現在時刻
    }));
    const { error } = await sb.from("matches").insert(rows);
    if (error) throw error;
    inserted = newMatches.length;
  }

  // 全試合からチーム統計を再計算
  const { data: allMatches, error: fetchErr } = await sb
    .from("matches")
    .select("team1, team2, winner");
  if (fetchErr) throw fetchErr;

  const stats = new Map<string, { wins: number; losses: number }>();
  for (const m of allMatches ?? []) {
    if (!m.winner || !m.team1 || !m.team2) continue;
    if (!stats.has(m.team1)) stats.set(m.team1, { wins: 0, losses: 0 });
    if (!stats.has(m.team2)) stats.set(m.team2, { wins: 0, losses: 0 });
    if (m.winner === m.team1) {
      stats.get(m.team1)!.wins++;
      stats.get(m.team2)!.losses++;
    } else {
      stats.get(m.team2)!.wins++;
      stats.get(m.team1)!.losses++;
    }
  }

  const teamRows = Array.from(stats.entries())
    .filter(([, s]) => s.wins + s.losses > 0)
    .map(([team, { wins, losses }]) => ({
      team,
      wins,
      losses,
      matches: wins + losses,
      win_rate: parseFloat((wins / (wins + losses)).toFixed(4)),
    }));

  if (teamRows.length > 0) {
    const { error: upsertErr } = await sb
      .from("team_stats")
      .upsert(teamRows, { onConflict: "team" });
    if (upsertErr) throw upsertErr;
  }

  return { inserted, totalScraped: matches.length, teamsUpdated: teamRows.length };
}

export async function GET(request: Request) {
  // 認証チェック（CRON_SECRET が設定されている場合のみ）
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: "Supabase 環境変数が未設定です" },
      { status: 500 }
    );
  }

  try {
    const startTime = Date.now();
    const matches = await scrapeRecentResults(3);
    const result = await upsertMatchesAndStats(matches);
    const elapsed = Date.now() - startTime;

    console.log("[cron/refresh]", { ...result, elapsed });
    return NextResponse.json({
      ok: true,
      ...result,
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/refresh]", err);
    return NextResponse.json(
      { error: String(err), ok: false },
      { status: 500 }
    );
  }
}
