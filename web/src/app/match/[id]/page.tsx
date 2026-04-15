"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

type MapResult = {
  map: string;
  score1: string;
  score2: string;
  agents_team1: string[];
  agents_team2: string[];
};

type PlayerStat = {
  team_idx: number;
  name: string;
  agent: string;
  acs: string;
  adr: string;
  hs_pct: string;
  rating: string;
  kills: string;
  deaths: string;
};

type MatchDetail = {
  match_id: string;
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  winner: string;
  event: string;
  maps: MapResult[];
  players: PlayerStat[];
  team1_url: string;
  team2_url: string;
  match_time_jst: string;
  team1_win_prob: number;
  team2_win_prob: number;
  predicted_winner: string;
  is_tossup: boolean;
};

const AGENT_COLORS: Record<string, string> = {
  Jett: "text-blue-300", Reyna: "text-purple-400", Neon: "text-yellow-300",
  Phoenix: "text-orange-400", Raze: "text-red-400", Yoru: "text-blue-500",
  Sage: "text-green-300", Killjoy: "text-yellow-400", Cypher: "text-gray-300",
  Chamber: "text-yellow-500", Deadlock: "text-cyan-400",
  Sova: "text-blue-400", Fade: "text-purple-300", Gekko: "text-green-400",
  Breach: "text-orange-500", KAY_O: "text-gray-400",
  Skye: "text-emerald-400", Astra: "text-purple-500", Omen: "text-indigo-400",
  Viper: "text-green-500", Brimstone: "text-orange-600", Harbor: "text-teal-400",
  Clove: "text-pink-400", Vyse: "text-cyan-500",
};
const agentColor = (a: string) => AGENT_COLORS[a] ?? "text-gray-400";

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "players">("overview");

  useEffect(() => {
    fetch(`/api/match?id=${id}`)
      .then((r) => r.json())
      .then(setMatch)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-900 rounded-xl animate-pulse" />)}
      </div>
    </main>
  );

  if (!match) return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-500">
        試合が見つかりません
        <Link href="/" className="block mt-4 text-red-400 hover:text-red-300 text-sm">← ホームへ</Link>
      </div>
    </main>
  );

  const t1won = match.winner?.toLowerCase().includes(match.team1.toLowerCase());
  const t2won = match.winner?.toLowerCase().includes(match.team2.toLowerCase());
  const predMark = match.is_tossup ? { label: "拮抗", cls: "text-gray-400 bg-gray-800" }
    : match.predicted_winner === match.winner ? { label: "✅ 的中", cls: "text-green-400 bg-green-500/10" }
    : { label: "❌ 外れ", cls: "text-red-400 bg-red-500/10" };

  const team1Players = (match.players ?? []).filter((p) => p.team_idx === 0);
  const team2Players = (match.players ?? []).filter((p) => p.team_idx === 1);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* スコアヘッダー */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-5">
          <p className="text-xs text-gray-500 text-center mb-4 truncate">{match.event}</p>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className={`text-right ${t1won ? "" : "opacity-50"}`}>
              <Link href={`/team/${encodeURIComponent(match.team1)}`} className="text-lg font-black text-white hover:underline leading-tight block">
                {match.team1}
              </Link>
              <p className="text-xs text-gray-500 mt-1">予想 {(match.team1_win_prob * 100).toFixed(0)}%</p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <span className={`text-4xl font-black tabular-nums ${t1won ? "text-green-400" : "text-gray-500"}`}>{match.score1}</span>
                <span className="text-gray-700">–</span>
                <span className={`text-4xl font-black tabular-nums ${t2won ? "text-green-400" : "text-gray-500"}`}>{match.score2}</span>
              </div>
              <div className="flex w-32 h-1.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full" style={{ width: `${match.team1_win_prob * 100}%` }} />
                <div className="bg-red-500 h-full flex-1" />
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${predMark.cls}`}>{predMark.label}</span>
            </div>

            <div className={`${t2won ? "" : "opacity-50"}`}>
              <Link href={`/team/${encodeURIComponent(match.team2)}`} className="text-lg font-black text-white hover:underline leading-tight block">
                {match.team2}
              </Link>
              <p className="text-xs text-gray-500 mt-1">予想 {(match.team2_win_prob * 100).toFixed(0)}%</p>
            </div>
          </div>

          {match.match_time_jst && (
            <p className="text-xs text-gray-600 text-center mt-4">{match.match_time_jst}</p>
          )}
        </section>

        {/* タブ */}
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
          {(["overview", "players"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === t ? "bg-red-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {t === "overview" ? "マップ別" : "選手スタッツ"}
            </button>
          ))}
        </div>

        {/* マップ別 */}
        {tab === "overview" && (
          <div className="space-y-3">
            {match.maps.map((mp, i) => {
              const s1 = parseInt(mp.score1 ?? "0");
              const s2 = parseInt(mp.score2 ?? "0");
              const t1w = s1 > s2;
              return (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white">{mp.map}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="text-right">
                      <span className={`text-2xl font-black tabular-nums ${t1w ? "text-green-400" : "text-gray-500"}`}>{mp.score1}</span>
                      <div className="flex flex-wrap justify-end gap-1 mt-2">
                        {(mp.agents_team1 ?? []).map((a, j) => (
                          <span key={j} className={`text-xs ${agentColor(a)}`}>{a}</span>
                        ))}
                      </div>
                    </div>
                    <span className="text-gray-700 text-sm">–</span>
                    <div>
                      <span className={`text-2xl font-black tabular-nums ${!t1w ? "text-green-400" : "text-gray-500"}`}>{mp.score2}</span>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(mp.agents_team2 ?? []).map((a, j) => (
                          <span key={j} className={`text-xs ${agentColor(a)}`}>{a}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 選手スタッツ */}
        {tab === "players" && (
          <div className="space-y-4">
            {[
              { team: match.team1, players: team1Players, url: match.team1_url },
              { team: match.team2, players: team2Players, url: match.team2_url },
            ].map(({ team, players, url }) => (
              <div key={team} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <Link href={`/team/${encodeURIComponent(team)}`} className="font-bold text-white hover:underline">{team}</Link>
                  {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:text-red-300">vlr.gg →</a>}
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-4 py-2 text-gray-500 font-medium">選手</th>
                      <th className="text-left px-2 py-2 text-gray-500 font-medium">エージェント</th>
                      <th className="text-right px-2 py-2 text-yellow-500 font-medium">ACS</th>
                      <th className="text-right px-2 py-2 text-gray-500 font-medium">K</th>
                      <th className="text-right px-2 py-2 text-gray-500 font-medium">D</th>
                      <th className="text-right px-2 py-2 text-blue-400 font-medium">HS%</th>
                      <th className="text-right px-4 py-2 text-gray-500 font-medium">ADR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr key={p.name} className="border-b border-gray-800/40">
                        <td className="px-4 py-2.5 font-medium text-white">{p.name}</td>
                        <td className={`px-2 py-2.5 ${agentColor(p.agent)}`}>{p.agent || "—"}</td>
                        <td className="px-2 py-2.5 text-right text-yellow-400 font-bold tabular-nums">{p.acs || "—"}</td>
                        <td className="px-2 py-2.5 text-right text-gray-300 tabular-nums">{p.kills || "—"}</td>
                        <td className="px-2 py-2.5 text-right text-gray-500 tabular-nums">{p.deaths?.replace(/\//g,"") || "—"}</td>
                        <td className="px-2 py-2.5 text-right text-blue-400 tabular-nums">{p.hs_pct ? `${p.hs_pct}%` : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400 tabular-nums">{p.adr || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-700 text-center pb-4">データ提供: vlr.gg</p>
      </div>
    </main>
  );
}
