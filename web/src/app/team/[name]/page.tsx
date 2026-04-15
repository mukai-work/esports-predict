"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

type PlayerEntry = {
  name: string;
  agent: string;
  acs: number;
  adr: number;
  hs_pct: number;
  rating: number;
  matches: number;
};

type MapStat = { map: string; win_rate: number; played: number };

type RecentMatch = {
  match_id: string;
  opponent: string;
  score: string;
  won: boolean;
  event: string;
};

type TeamDetail = {
  team: string;
  players: PlayerEntry[];
  recent_matches: RecentMatch[];
  map_stats: MapStat[];
  vlr_url: string;
  total_matches: number;
};

export default function TeamPage() {
  const { name } = useParams<{ name: string }>();
  const router = useRouter();
  const decoded = decodeURIComponent(name);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/team-detail?team=${encodeURIComponent(decoded)}`)
      .then((r) => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [decoded]);

  const wins = detail?.recent_matches.filter((m) => m.won).length ?? 0;
  const total = detail?.recent_matches.length ?? 0;

  // フォームバッジ（直近5試合）
  const form = detail?.recent_matches.slice(0, 5).map((m) => m.won ? "W" : "L") ?? [];

  // 最も対戦した相手（クイック予想用）
  const topOpponent = detail?.recent_matches[0]?.opponent ?? null;

  function goToCompare(opponent?: string) {
    const params = new URLSearchParams({ team1: decoded });
    if (opponent) params.set("team2", opponent);
    router.push(`/compare?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      {loading && (
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-900 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!loading && detail && (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

          {/* チームヘッダー */}
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white leading-none">{detail.team}</h2>
                <p className="text-sm text-gray-500 mt-1">{detail.total_matches} 試合データ</p>

                {/* フォーム（直近5試合） */}
                {form.length > 0 && (
                  <div className="flex items-center gap-1 mt-3">
                    <span className="text-xs text-gray-500 mr-1">直近</span>
                    {form.map((r, i) => (
                      <span
                        key={i}
                        className={`text-xs font-bold w-6 h-6 rounded flex items-center justify-center ${
                          r === "W" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {detail.vlr_url && (
                <a
                  href={detail.vlr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  vlr.gg →
                </a>
              )}
            </div>

            {/* アクションボタン */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => goToCompare()}
                className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg transition-colors font-semibold"
              >
                ⚡ このチームで比較予想
              </button>
              {detail.recent_matches.slice(0, 5).map((m) => m.opponent).filter(Boolean).slice(0, 3).map((opp) => (
                <button
                  key={opp}
                  onClick={() => goToCompare(opp)}
                  className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg transition-colors border border-gray-700"
                >
                  vs {opp}
                </button>
              ))}
            </div>
          </section>

          {/* 選手スタッツ */}
          {detail.players.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">選手スタッツ（平均）</h3>
              <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-4 py-2.5 text-xs text-gray-500 font-medium">選手</th>
                      <th className="text-left px-3 py-2.5 text-xs text-gray-500 font-medium">エージェント</th>
                      <th className="text-right px-3 py-2.5 text-xs text-yellow-500 font-medium">ACS</th>
                      <th className="text-right px-3 py-2.5 text-xs text-gray-500 font-medium">ADR</th>
                      <th className="text-right px-3 py-2.5 text-xs text-blue-400 font-medium">HS%</th>
                      <th className="text-right px-4 py-2.5 text-xs text-gray-500 font-medium">試合</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.players.map((p, i) => (
                      <tr key={p.name} className={`border-b border-gray-800/50 ${i === 0 ? "bg-yellow-500/5" : ""}`}>
                        <td className="px-4 py-2.5 font-medium text-white">{p.name}</td>
                        <td className="px-3 py-2.5 text-gray-400 text-xs">{p.agent || "—"}</td>
                        <td className="px-3 py-2.5 text-right text-yellow-400 font-bold tabular-nums">{p.acs || "—"}</td>
                        <td className="px-3 py-2.5 text-right text-gray-300 tabular-nums">{p.adr || "—"}</td>
                        <td className="px-3 py-2.5 text-right text-blue-400 tabular-nums">{p.hs_pct ? `${p.hs_pct}%` : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{p.matches}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* マップ勝率 */}
          {detail.map_stats.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">マップ別勝率</h3>
              <div className="grid grid-cols-2 gap-2">
                {detail.map_stats.map((m) => (
                  <div key={m.map} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white leading-none">{m.map}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{m.played} 試合</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-black tabular-nums ${
                        m.win_rate >= 0.6 ? "text-green-400" :
                        m.win_rate >= 0.4 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {(m.win_rate * 100).toFixed(0)}%
                      </p>
                      <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            m.win_rate >= 0.6 ? "bg-green-500" :
                            m.win_rate >= 0.4 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${m.win_rate * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 直近の試合 */}
          {detail.recent_matches.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">直近の試合</h3>
              <div className="space-y-2">
                {detail.recent_matches.map((m) => (
                  <div key={m.match_id} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                    <span className={`text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      m.won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {m.won ? "W" : "L"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">vs {m.opponent}</p>
                      <p className="text-xs text-gray-600 truncate">{m.event}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-gray-300 shrink-0">{m.score}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!detail.players.length && !detail.map_stats.length && !detail.recent_matches.length && (
            <div className="text-center text-gray-600 py-16">
              <p>このチームのデータが見つかりません</p>
              <Link href="/" className="text-red-400 text-sm mt-2 block hover:text-red-300">← ホームへ</Link>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
