"use client";

import { useEffect, useState } from "react";

type MapStat = {
  map: string;
  team1_played: number;
  team1_win_rate: number;
  team2_played: number;
  team2_win_rate: number;
  predicted_winner: string | null;
};

type Props = { team1: string; team2: string };

export default function MapPrediction({ team1, team2 }: Props) {
  const [maps, setMaps] = useState<MapStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!team1 || !team2) return;
    setLoading(true);
    fetch(`/api/map-predict?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`)
      .then((r) => r.json())
      .then((d) => setMaps(d.maps ?? []))
      .finally(() => setLoading(false));
  }, [team1, team2]);

  if (loading) {
    return <div className="h-24 bg-gray-800 rounded-lg animate-pulse" />;
  }
  if (maps.length === 0) {
    return (
      <p className="text-xs text-gray-600 text-center py-4">
        マップデータが不足しています
      </p>
    );
  }

  // データが十分なマップだけ表示（片方でも1試合以上）
  const filtered = maps.filter((m) => m.team1_played + m.team2_played >= 1).slice(0, 8);

  return (
    <div className="space-y-2">
      {filtered.map((m) => (
        <div key={m.map} className="flex items-center gap-3">
          {/* マップ名 */}
          <span className="text-xs text-gray-400 w-24 shrink-0">{m.map}</span>

          {/* team1 勝率バー */}
          <div className="flex-1 flex items-center gap-1">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(m.team1_win_rate * 100).toFixed(0)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8 text-right tabular-nums">
              {m.team1_played > 0 ? `${(m.team1_win_rate * 100).toFixed(0)}%` : "—"}
            </span>
          </div>

          {/* 予想マーク */}
          <span className="text-xs w-5 text-center">
            {m.predicted_winner === team1 ? "◀" : m.predicted_winner === team2 ? "▶" : "—"}
          </span>

          {/* team2 勝率バー */}
          <div className="flex-1 flex items-center gap-1">
            <span className="text-xs text-gray-500 w-8 tabular-nums">
              {m.team2_played > 0 ? `${(m.team2_win_rate * 100).toFixed(0)}%` : "—"}
            </span>
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${(m.team2_win_rate * 100).toFixed(0)}%` }}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-between text-xs text-gray-600 pt-1">
        <span>{team1}</span>
        <span>{team2}</span>
      </div>
    </div>
  );
}
