"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import MapPrediction from "@/components/MapPrediction";

type MapStat = { map: string; win_rate: number; played: number };

type RecentForm = { rate: number; wins: number; total: number };

function ShareButton({ team1, team2, prob, winner }: { team1: string; team2: string; prob: number; winner: string }) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`
    : `https://valorant-ai-predict.vercel.app/?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`;

  const shareText = `【Valorant AI 予想】${team1} vs ${team2}\n勝率: ${team1} ${(prob * 100).toFixed(0)}% - ${team2} ${((1 - prob) * 100).toFixed(0)}%\nAI予想勝者: ${winner}\n\n${url}`;

  function handleCopy() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  function handleXShare() {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(tweetUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopy}
        className="flex-1 flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg py-2 transition-colors"
      >
        {copied ? (
          <><span>✓</span> コピーしました</>
        ) : (
          <><span>↗</span> URLをコピー</>
        )}
      </button>
      <button
        onClick={handleXShare}
        className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-2 transition-colors"
        title="X(Twitter)でシェア"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        X
      </button>
    </div>
  );
}

type PredictResult = {
  team1: string;
  team2: string;
  team1_win_prob: number;
  team2_win_prob: number;
  predicted_winner: string;
  confidence: number;
  team1_stats: { matches: number; wins: number; win_rate: number };
  team2_stats: { matches: number; wins: number; win_rate: number };
  team1_recent_form?: RecentForm;
  team2_recent_form?: RecentForm;
  h2h: { total: number; team1_wins: number; team2_wins: number; team1_rate: number };
  team1_map_stats: MapStat[];
  team2_map_stats: MapStat[];
  note?: string | null;
};

type TeamEntry = { team: string; win_rate: string; matches: string };

export default function PredictForm() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [team1, setTeam1] = useState(searchParams.get("team1") ?? "");
  const [team2, setTeam2] = useState(searchParams.get("team2") ?? "");
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setTeams((d.teams ?? []).map((t: TeamEntry) => t.team)));
  }, []);

  // URLパラメーターで両チームが指定されたら自動予想
  useEffect(() => {
    const t1 = searchParams.get("team1");
    const t2 = searchParams.get("team2");
    if (t1 && t2) {
      setTeam1(t1);
      setTeam2(t2);
      // 少し待ってからサブミット（teams ロード後）
      setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!team1.trim() || !team2.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(
        `/api/predict?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`
      );
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-6">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
          {/* Team 1 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400">チーム 1</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
              list="team-list"
              value={team1}
              onChange={(e) => setTeam1(e.target.value)}
              placeholder="例: Team Liquid"
            />
          </div>

          <div className="text-gray-600 font-bold text-lg mb-2">vs</div>

          {/* Team 2 */}
          <div className="space-y-1">
            <label className="text-xs text-gray-400">チーム 2</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
              list="team-list"
              value={team2}
              onChange={(e) => setTeam2(e.target.value)}
              placeholder="例: Sentinels"
            />
          </div>
        </div>

        <datalist id="team-list">
          {teams.map((t) => <option key={t} value={t} />)}
        </datalist>

        <button
          type="submit"
          disabled={loading || !team1 || !team2}
          className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {loading ? "予想中..." : "AI で予想する"}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="space-y-4 pt-2 border-t border-gray-800">
          {/* Predicted winner + confidence */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">AI 予想勝者</p>
              <p className="text-xl font-bold text-red-400">{result.predicted_winner}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">信頼度</p>
              <div className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      result.confidence >= 60 ? "bg-green-500" :
                      result.confidence >= 30 ? "bg-yellow-500" : "bg-gray-500"
                    }`}
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{result.confidence}%</span>
              </div>
            </div>
          </div>

          {/* Probability bars: team1=緑 team2=赤 */}
          <div className="space-y-3">
            {[
              { team: result.team1, prob: result.team1_win_prob, stats: result.team1_stats, color: "bg-green-500" },
              { team: result.team2, prob: result.team2_win_prob, stats: result.team2_stats, color: "bg-red-500" },
            ].map(({ team, prob, stats, color }) => (
              <div key={team} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className={team === result.predicted_winner ? "text-white font-semibold" : "text-gray-400"}>
                    {team}
                  </span>
                  <span className="text-gray-300 tabular-nums font-bold">
                    {(prob * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${color}`}
                    style={{ width: `${prob * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600">
                  {stats.matches} 試合 · 勝率 {(stats.win_rate * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>

          {/* 直近フォーム */}
          {(result.team1_recent_form || result.team2_recent_form) && (
            <div className="bg-gray-800/50 rounded-lg px-4 py-3 space-y-2">
              <p className="text-xs text-gray-500">直近フォーム（最大5試合）</p>
              {[
                { team: result.team1, form: result.team1_recent_form, color: "text-green-400" },
                { team: result.team2, form: result.team2_recent_form, color: "text-red-400" },
              ].map(({ team, form, color }) =>
                form && form.total > 0 ? (
                  <div key={team} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 w-28 truncate">{team}</span>
                    <div className="flex items-center gap-2 flex-1 ml-2">
                      <div className="h-1.5 flex-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            form.rate >= 0.6 ? "bg-green-500" :
                            form.rate >= 0.4 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${form.rate * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs tabular-nums font-semibold ${color} w-10 text-right`}>
                        {form.wins}W {form.total - form.wins}L
                      </span>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Head-to-Head */}
          {result.h2h.total > 0 && (
            <div className="bg-gray-800/50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 mb-2">直接対決（{result.h2h.total}試合）</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300 flex-1 text-right">{result.team1}</span>
                <div className="flex gap-1">
                  <span className="text-sm font-bold text-green-400">{result.h2h.team1_wins}</span>
                  <span className="text-gray-600">-</span>
                  <span className="text-sm font-bold text-gray-400">{result.h2h.team2_wins}</span>
                </div>
                <span className="text-xs text-gray-300 flex-1">{result.team2}</span>
              </div>
            </div>
          )}

          {result.note && (
            <p className="text-xs text-yellow-600 bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-3 py-2">
              ⚠ {result.note}
            </p>
          )}

          {/* 予想根拠サマリー */}
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg px-4 py-3 space-y-2">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">予想根拠</p>
            {[
              {
                label: "通算勝率",
                t1val: `${(result.team1_stats.win_rate * 100).toFixed(0)}%`,
                t2val: `${(result.team2_stats.win_rate * 100).toFixed(0)}%`,
                favors: result.team1_stats.win_rate > result.team2_stats.win_rate
                  ? result.team1 : result.team2_stats.win_rate > result.team1_stats.win_rate
                  ? result.team2 : null,
              },
              result.team1_recent_form && result.team2_recent_form ? {
                label: "直近フォーム",
                t1val: `${(result.team1_recent_form.rate * 100).toFixed(0)}%`,
                t2val: `${(result.team2_recent_form.rate * 100).toFixed(0)}%`,
                favors: result.team1_recent_form.rate > result.team2_recent_form.rate
                  ? result.team1 : result.team2_recent_form.rate > result.team1_recent_form.rate
                  ? result.team2 : null,
              } : null,
              result.h2h.total > 0 ? {
                label: `直接対決 (${result.h2h.total}試合)`,
                t1val: `${result.h2h.team1_wins}勝`,
                t2val: `${result.h2h.team2_wins}勝`,
                favors: result.h2h.team1_wins > result.h2h.team2_wins
                  ? result.team1 : result.h2h.team2_wins > result.h2h.team1_wins
                  ? result.team2 : null,
              } : null,
            ].filter(Boolean).map((factor) => factor && (
              <div key={factor.label} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-28 shrink-0">{factor.label}</span>
                <span className={factor.favors === result.team1 ? "text-green-400 font-semibold" : "text-gray-400"}>
                  {factor.t1val}
                </span>
                <span className="text-gray-700 mx-1">vs</span>
                <span className={factor.favors === result.team2 ? "text-green-400 font-semibold" : "text-gray-400"}>
                  {factor.t2val}
                </span>
                {factor.favors && (
                  <span className="text-gray-600 ml-auto">→ {factor.favors}</span>
                )}
                {!factor.favors && (
                  <span className="text-gray-600 ml-auto">拮抗</span>
                )}
              </div>
            ))}
          </div>

          {/* マップ別勝率 */}
          {(result.team1_map_stats.length > 0 || result.team2_map_stats.length > 0) && (
            <div className="pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-3">マップ別勝率</p>
              <MapPrediction team1={result.team1} team2={result.team2} />
            </div>
          )}

          {/* 共有ボタン */}
          <ShareButton team1={result.team1} team2={result.team2} prob={result.team1_win_prob} winner={result.predicted_winner} />

          <p className="text-xs text-gray-600 text-center">
            ※ AI予想は参考情報です。実際の試合結果を保証するものではありません。
          </p>
        </div>
      )}
    </div>
  );
}
