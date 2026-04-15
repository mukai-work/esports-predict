"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ScheduleMatch = {
  match_id: string;
  team1: string;
  team2: string;
  match_time: string;
  event: string;
  status: string;
  url: string;
  team1_win_prob: number;
  team2_win_prob: number;
  predicted_winner: string;
  region: string;
};

export default function FeaturedMatch() {
  const [match, setMatch] = useState<ScheduleMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => {
        const matches: ScheduleMatch[] = d.matches ?? [];
        // LIVE試合を優先、なければ最初のupcoming
        const live = matches.find((m) => m.status === "live");
        const upcoming = matches.find((m) => m.status === "upcoming" && m.team1 !== "TBD" && m.team2 !== "TBD");
        setMatch(live ?? upcoming ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-24 bg-gray-900 rounded-xl animate-pulse" />;
  }
  if (!match) return null;

  const isLive = match.status === "live";
  const diff = Math.abs(match.team1_win_prob - 0.5);
  const isClose = diff < 0.06;

  return (
    <div className={`rounded-xl border px-5 py-4 ${
      isLive
        ? "bg-red-500/5 border-red-500/30"
        : "bg-gray-900 border-gray-800"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="text-xs font-bold text-red-400 animate-pulse">● LIVE</span>
          ) : (
            <span className="text-xs text-gray-500">次の試合</span>
          )}
          {isClose && (
            <span className="text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">⚡ 接戦</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 truncate max-w-[160px]">{match.event}</span>
          {match.match_time && match.status !== "live" && (
            <span className="text-xs text-gray-500 tabular-nums shrink-0">{match.match_time} JST</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-right">
          <Link
            href={`/team/${encodeURIComponent(match.team1)}`}
            className={`font-bold text-sm hover:underline ${match.predicted_winner === match.team1 ? "text-white" : "text-gray-400"}`}
          >
            {match.team1}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{(match.team1_win_prob * 100).toFixed(0)}%</p>
        </div>

        <div className="flex flex-col items-center gap-1 w-24">
          <div className="flex w-full h-1.5 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${match.team1_win_prob * 100}%` }} />
            <div className="bg-red-500 h-full flex-1" />
          </div>
          <Link
            href={`/?team1=${encodeURIComponent(match.team1)}&team2=${encodeURIComponent(match.team2)}`}
            className="text-xs text-red-400 hover:text-red-300 transition-colors font-semibold"
          >
            予想する →
          </Link>
        </div>

        <div>
          <Link
            href={`/team/${encodeURIComponent(match.team2)}`}
            className={`font-bold text-sm hover:underline ${match.predicted_winner === match.team2 ? "text-white" : "text-gray-400"}`}
          >
            {match.team2}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{(match.team2_win_prob * 100).toFixed(0)}%</p>
        </div>
      </div>
    </div>
  );
}
