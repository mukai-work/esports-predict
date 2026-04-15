"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

type MapStat = { map: string; win_rate: number; played: number };
type RecentForm = { rate: number; wins: number; total: number };

type PredictResult = {
  team1: string;
  team2: string;
  team1_win_prob: number;
  team2_win_prob: number;
  predicted_winner: string;
  confidence: number;
  team1_stats: { matches: number; wins: number; losses: number; win_rate: number };
  team2_stats: { matches: number; wins: number; losses: number; win_rate: number };
  team1_recent_form?: RecentForm;
  team2_recent_form?: RecentForm;
  h2h: { total: number; team1_wins: number; team2_wins: number; team1_rate: number };
  team1_map_stats: MapStat[];
  team2_map_stats: MapStat[];
  note?: string | null;
};

function StatRow({ label, v1, v2 }: { label: string; v1: number | string; v2: number | string }) {
  const n1 = parseFloat(String(v1).replace("%", "").replace("勝", "").replace("敗", ""));
  const n2 = parseFloat(String(v2).replace("%", "").replace("勝", "").replace("敗", ""));
  const t1Wins = !isNaN(n1) && !isNaN(n2) && n1 > n2;
  const t2Wins = !isNaN(n1) && !isNaN(n2) && n2 > n1;
  return (
    <div className="grid grid-cols-[1fr_7rem_1fr] items-center gap-2 py-2.5 border-b border-gray-800/40">
      <span className={`text-sm text-right tabular-nums font-semibold ${t1Wins ? "text-white" : "text-gray-500"}`}>{v1}</span>
      <span className="text-xs text-gray-500 text-center">{label}</span>
      <span className={`text-sm text-left tabular-nums font-semibold ${t2Wins ? "text-white" : "text-gray-500"}`}>{v2}</span>
    </div>
  );
}

export default function CompareClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [team1, setTeam1] = useState(searchParams.get("team1") ?? "");
  const [team2, setTeam2] = useState(searchParams.get("team2") ?? "");
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setTeams((d.teams ?? []).map((t: { team: string }) => t.team)));
  }, []);

  const compare = useCallback(async (t1: string, t2: string) => {
    if (!t1.trim() || !t2.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/predict?team1=${encodeURIComponent(t1)}&team2=${encodeURIComponent(t2)}`);
      const data = await res.json();
      setResult(data);
      router.replace(`/compare?team1=${encodeURIComponent(t1)}&team2=${encodeURIComponent(t2)}`, { scroll: false });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const t1 = searchParams.get("team1");
    const t2 = searchParams.get("team2");
    if (t1 && t2) compare(t1, t2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    compare(team1, team2);
  }

  function swap() {
    const newT1 = team2;
    const newT2 = team1;
    setTeam1(newT1);
    setTeam2(newT2);
    if (result) compare(newT1, newT2);
  }

  // 両チームに共通するマップのみ表示
  const allMapNames = Array.from(new Set([
    ...(result?.team1_map_stats.map((m) => m.map) ?? []),
    ...(result?.team2_map_stats.map((m) => m.map) ?? []),
  ]));
  const mapCompare = allMapNames.map((mapName) => ({
    map: mapName,
    t1: result?.team1_map_stats.find((m) => m.map === mapName) ?? null,
    t2: result?.team2_map_stats.find((m) => m.map === mapName) ?? null,
  })).sort((a, b) => ((b.t1?.played ?? 0) + (b.t2?.played ?? 0)) - ((a.t1?.played ?? 0) + (a.t2?.played ?? 0)));

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
            チーム比較
          </h2>
          <p className="text-xs text-gray-600">2チームを選んで詳細な対戦予想を確認</p>
        </div>

        {/* 入力フォーム */}
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">チーム 1</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
                list="cmp-team-list"
                value={team1}
                onChange={(e) => setTeam1(e.target.value)}
                placeholder="例: Team Liquid"
              />
            </div>
            <button
              type="button"
              onClick={swap}
              className="mb-1 w-9 h-9 flex items-center justify-center text-gray-500 hover:text-white transition-colors bg-gray-800 border border-gray-700 rounded-lg text-sm"
              title="入れ替え"
            >
              ⇄
            </button>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">チーム 2</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
                list="cmp-team-list"
                value={team2}
                onChange={(e) => setTeam2(e.target.value)}
                placeholder="例: Sentinels"
              />
            </div>
          </div>
          <datalist id="cmp-team-list">
            {teams.map((t) => <option key={t} value={t} />)}
          </datalist>
          <button
            type="submit"
            disabled={loading || !team1 || !team2}
            className="mt-4 w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? "比較中..." : "詳細比較する"}
          </button>
        </form>

        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {result && !loading && (
          <div className="space-y-5">

            {/* 予想勝者バナー */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-5 text-center space-y-3">
              <p className="text-xs text-gray-500">AI 予想勝者</p>
              <p className="text-2xl font-black text-red-400">{result.predicted_winner}</p>
              <div className="flex items-center gap-3 max-w-sm mx-auto">
                <Link href={`/team/${encodeURIComponent(result.team1)}`} className="text-sm font-semibold text-gray-300 hover:text-red-400 text-right flex-1 truncate transition-colors">
                  {result.team1}
                </Link>
                <div className="flex-1 space-y-1">
                  <div className="flex h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full transition-all duration-700" style={{ width: `${result.team1_win_prob * 100}%` }} />
                    <div className="bg-red-500 h-full flex-1" />
                  </div>
                  <div className="flex justify-between text-xs tabular-nums">
                    <span className="text-green-400 font-bold">{(result.team1_win_prob * 100).toFixed(1)}%</span>
                    <span className="text-red-400 font-bold">{(result.team2_win_prob * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <Link href={`/team/${encodeURIComponent(result.team2)}`} className="text-sm font-semibold text-gray-300 hover:text-red-400 flex-1 truncate transition-colors">
                  {result.team2}
                </Link>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <span>信頼度</span>
                <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${result.confidence >= 60 ? "bg-green-500" : result.confidence >= 30 ? "bg-yellow-500" : "bg-gray-500"}`}
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
                <span className="font-semibold text-gray-300">{result.confidence}%</span>
              </div>
            </div>

            {/* スタッツ比較表 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
              <div className="grid grid-cols-[1fr_7rem_1fr] mb-4">
                <Link href={`/team/${encodeURIComponent(result.team1)}`} className="text-sm font-bold text-white text-right hover:text-red-400 transition-colors truncate pr-2">{result.team1}</Link>
                <span className="text-xs text-gray-500 text-center self-center">指標</span>
                <Link href={`/team/${encodeURIComponent(result.team2)}`} className="text-sm font-bold text-white hover:text-red-400 transition-colors truncate pl-2">{result.team2}</Link>
              </div>

              <StatRow label="通算試合数" v1={result.team1_stats.matches} v2={result.team2_stats.matches} />
              <StatRow label="通算勝率" v1={`${(result.team1_stats.win_rate * 100).toFixed(0)}%`} v2={`${(result.team2_stats.win_rate * 100).toFixed(0)}%`} />
              <StatRow label="通算勝敗" v1={`${result.team1_stats.wins}W-${result.team1_stats.losses}L`} v2={`${result.team2_stats.wins}W-${result.team2_stats.losses}L`} />
              {result.team1_recent_form && result.team2_recent_form && result.team1_recent_form.total > 0 && (
                <>
                  <StatRow
                    label="直近フォーム"
                    v1={`${result.team1_recent_form.wins}勝${result.team1_recent_form.total - result.team1_recent_form.wins}敗`}
                    v2={`${result.team2_recent_form.wins}勝${result.team2_recent_form.total - result.team2_recent_form.wins}敗`}
                  />
                  <StatRow
                    label="直近勝率"
                    v1={`${(result.team1_recent_form.rate * 100).toFixed(0)}%`}
                    v2={`${(result.team2_recent_form.rate * 100).toFixed(0)}%`}
                  />
                </>
              )}
              {result.h2h.total > 0 && (
                <StatRow
                  label={`直接対決 (${result.h2h.total}戦)`}
                  v1={`${result.h2h.team1_wins}勝`}
                  v2={`${result.h2h.team2_wins}勝`}
                />
              )}
              {result.h2h.total === 0 && (
                <div className="py-2 text-xs text-gray-600 text-center">直接対決のデータなし</div>
              )}
            </div>

            {/* マップ別勝率比較 */}
            {mapCompare.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">マップ別勝率</h3>
                <div className="space-y-4">
                  {mapCompare.map(({ map, t1, t2 }) => {
                    const wr1 = t1?.win_rate ?? null;
                    const wr2 = t2?.win_rate ?? null;
                    const t1Adv = wr1 !== null && wr2 !== null && wr1 > wr2;
                    const t2Adv = wr1 !== null && wr2 !== null && wr2 > wr1;
                    return (
                      <div key={map}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className={`tabular-nums font-semibold w-10 text-right ${t1Adv ? "text-green-400" : "text-gray-500"}`}>
                            {wr1 !== null ? `${(wr1 * 100).toFixed(0)}%` : "—"}
                          </span>
                          <span className="text-gray-400 font-medium text-center flex-1">{map}</span>
                          <span className={`tabular-nums font-semibold w-10 text-left ${t2Adv ? "text-red-400" : "text-gray-500"}`}>
                            {wr2 !== null ? `${(wr2 * 100).toFixed(0)}%` : "—"}
                          </span>
                        </div>
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
                          {wr1 !== null && (
                            <div
                              className={`h-full ${t1Adv ? "bg-green-500" : wr1 >= 0.5 ? "bg-green-700" : "bg-gray-600"}`}
                              style={{ width: `${wr1 * 50}%` }}
                            />
                          )}
                          <div className="flex-1 bg-gray-800" />
                          {wr2 !== null && (
                            <div
                              className={`h-full ${t2Adv ? "bg-red-500" : wr2 >= 0.5 ? "bg-red-700" : "bg-gray-600"}`}
                              style={{ width: `${wr2 * 50}%` }}
                            />
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-gray-700 mt-0.5">
                          <span>{t1?.played ?? 0}試合</span>
                          <span>{t2?.played ?? 0}試合</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {result.note && (
              <p className="text-xs text-yellow-600 bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-3 py-2">
                ⚠ {result.note}
              </p>
            )}

            <p className="text-xs text-gray-600 text-center pb-4">
              ※ AI予想は参考情報です。データ提供: vlr.gg
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
