"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";

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

type SortKey = "acs" | "adr" | "hs_pct";

const SORT_LABELS: Record<SortKey, string> = {
  acs: "ACS",
  adr: "ADR",
  hs_pct: "HS%",
};

const AGENT_COLORS: Record<string, string> = {
  Jett: "text-blue-300", Reyna: "text-purple-400", Neon: "text-yellow-300",
  Phoenix: "text-orange-400", Raze: "text-red-400", Yoru: "text-blue-500",
  Sage: "text-green-300", Killjoy: "text-yellow-400", Cypher: "text-gray-300",
  Chamber: "text-yellow-500", Deadlock: "text-cyan-400",
  Sova: "text-blue-400", Fade: "text-purple-300", Gekko: "text-green-400",
  Breach: "text-orange-500", Skye: "text-emerald-400", Astra: "text-purple-500",
  Omen: "text-indigo-400", Viper: "text-green-500", Brimstone: "text-orange-600",
  Harbor: "text-teal-400", Clove: "text-pink-400", Vyse: "text-cyan-500",
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("acs");
  const [minMatches, setMinMatches] = useState(3);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/players?sort=${sort}&min_matches=${minMatches}&limit=50`)
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []))
      .finally(() => setLoading(false));
  }, [sort, minMatches]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              選手ランキング
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {loading ? "読み込み中..." : `${players.length}人（最低${minMatches}試合）`}
            </p>
          </div>

          {/* コントロール */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* ソート */}
            <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    sort === key ? "bg-red-500 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>

            {/* 最低試合数 */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>最低</span>
              {[3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setMinMatches(n)}
                  className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                    minMatches === n ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
              <span>試合</span>
            </div>
          </div>
        </div>

        {/* テーブル */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          {/* ヘッダー */}
          <div className="grid grid-cols-[2.5rem_1fr_5rem_4rem_4rem_4rem_3.5rem] gap-2 px-4 py-3 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
            <span className="text-center">#</span>
            <span>選手 / チーム</span>
            <span className="text-center">エージェント</span>
            <span className={`text-right ${sort === "acs" ? "text-yellow-400" : ""}`}>ACS</span>
            <span className={`text-right ${sort === "adr" ? "text-yellow-400" : ""}`}>ADR</span>
            <span className={`text-right ${sort === "hs_pct" ? "text-yellow-400" : ""}`}>HS%</span>
            <span className="text-right">試合</span>
          </div>

          {loading && (
            <div className="space-y-0">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-14 border-b border-gray-800/40 animate-pulse bg-gray-800/20" />
              ))}
            </div>
          )}

          {!loading && players.map((p, i) => (
            <div
              key={`${p.name}-${p.team}`}
              className="grid grid-cols-[2.5rem_1fr_5rem_4rem_4rem_4rem_3.5rem] gap-2 px-4 py-3 border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors items-center"
            >
              {/* 順位 */}
              <span className={`text-center font-bold text-sm tabular-nums ${
                i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-600"
              }`}>
                {i + 1}
              </span>

              {/* 選手名 + チーム */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                <Link
                  href={`/team/${encodeURIComponent(p.team)}`}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors truncate block"
                >
                  {p.team}
                </Link>
              </div>

              {/* エージェント */}
              <span className={`text-xs text-center truncate ${AGENT_COLORS[p.agent] ?? "text-gray-400"}`}>
                {p.agent || "—"}
              </span>

              {/* ACS */}
              <span className={`text-right text-sm font-bold tabular-nums ${
                sort === "acs" ? "text-yellow-400" : "text-gray-300"
              }`}>
                {p.avg_acs || "—"}
              </span>

              {/* ADR */}
              <span className={`text-right text-xs tabular-nums ${
                sort === "adr" ? "text-yellow-400" : "text-gray-400"
              }`}>
                {p.avg_adr || "—"}
              </span>

              {/* HS% */}
              <span className={`text-right text-xs tabular-nums ${
                sort === "hs_pct" ? "text-yellow-400" : "text-blue-400"
              }`}>
                {p.avg_hs_pct ? `${p.avg_hs_pct}%` : "—"}
              </span>

              {/* 試合数 */}
              <span className="text-right text-xs text-gray-600 tabular-nums">{p.matches}</span>
            </div>
          ))}

          {!loading && players.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              データがありません
            </div>
          )}
        </div>

        <p className="text-xs text-gray-700 text-center pb-4">
          ※ 平均値は試合単位（マップ平均）。データ提供: vlr.gg
        </p>
      </div>
    </main>
  );
}
