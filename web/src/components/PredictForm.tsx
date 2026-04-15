"use client";

import { useState, useEffect } from "react";
import MapPrediction from "@/components/MapPrediction";

type MapStat = { map: string; win_rate: number; played: number };

type PredictResult = {
  team1: string;
  team2: string;
  team1_win_prob: number;
  team2_win_prob: number;
  predicted_winner: string;
  confidence: number;
  team1_stats: { matches: number; wins: number; win_rate: number };
  team2_stats: { matches: number; wins: number; win_rate: number };
  h2h: { total: number; team1_wins: number; team2_wins: number; team1_rate: number };
  team1_map_stats: MapStat[];
  team2_map_stats: MapStat[];
  note?: string | null;
};

type TeamEntry = { team: string; win_rate: string; matches: string };

export default function PredictForm() {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => setTeams((d.teams ?? []).map((t: TeamEntry) => t.team)));
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
      <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* マップ別勝率 */}
          {(result.team1_map_stats.length > 0 || result.team2_map_stats.length > 0) && (
            <div className="pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-3">マップ別勝率</p>
              <MapPrediction team1={result.team1} team2={result.team2} />
            </div>
          )}

          <p className="text-xs text-gray-600 text-center">
            ※ AI予想は参考情報です。実際の試合結果を保証するものではありません。
          </p>
        </div>
      )}
    </div>
  );
}
