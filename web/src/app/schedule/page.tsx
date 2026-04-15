"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import ScheduleCard from "@/components/ScheduleCard";
import MatchModal from "@/components/MatchModal";
import RegionTabs, { Region } from "@/components/RegionTabs";
import Header from "@/components/Header";

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

export default function SchedulePage() {
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<Region>("All");
  const [selectedMatch, setSelectedMatch] = useState<ScheduleMatch | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule");
      const d = await res.json();
      setMatches(d.matches ?? []);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // LIVE試合がある間は60秒ごとに自動更新
  useEffect(() => {
    const hasLive = matches.some((m) => m.status === "live");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (hasLive) {
      intervalRef.current = setInterval(loadMatches, 60_000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [matches, loadMatches]);

  const filtered = region === "All" ? matches : matches.filter((m) => m.region === region);

  const counts = matches.reduce<Partial<Record<Region, number>>>((acc, m) => {
    const r = m.region as Region;
    acc[r] = (acc[r] ?? 0) + 1;
    acc["All"] = (acc["All"] ?? 0) + 1;
    return acc;
  }, {});

  const liveMatches = filtered.filter((m) => m.status === "live");
  const upcomingMatches = filtered.filter((m) => m.status !== "live");

  // 接戦（45〜55%）の試合を抽出
  const closeMatches = upcomingMatches.filter(
    (m) => Math.abs(m.team1_win_prob - 0.5) < 0.06 && m.status !== "tbd"
  );

  const hasLive = matches.some((m) => m.status === "live");

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-5 sm:space-y-6">
        {/* タイトル + 更新状態 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              試合スケジュール & AI 予想
            </h2>
            {hasLive && (
              <span className="text-xs text-red-400 animate-pulse font-bold">● LIVE 自動更新中</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-600">
                更新: {lastUpdated.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <RegionTabs selected={region} onChange={setRegion} counts={counts} />
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-8 text-center text-gray-500 text-sm">
            このリージョンの試合はありません
          </div>
        )}

        {/* LIVE試合 */}
        {liveMatches.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">● NOW LIVE</h3>
            {liveMatches.map((m) => (
              <ScheduleCard key={m.match_id} match={m} onClick={setSelectedMatch} />
            ))}
          </section>
        )}

        {/* 接戦ハイライト（拮抗試合） */}
        {!loading && closeMatches.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider">⚡ 接戦注目カード</h3>
              <span className="text-xs text-gray-600">AI 予想 45〜55% の拮抗試合</span>
            </div>
            <div className="space-y-2">
              {closeMatches.slice(0, 3).map((m) => (
                <ScheduleCard key={`close-${m.match_id}`} match={m} onClick={setSelectedMatch} />
              ))}
            </div>
          </section>
        )}

        {/* 予定試合 */}
        {upcomingMatches.length > 0 && (
          <section className="space-y-3">
            {liveMatches.length > 0 && (
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">UPCOMING</h3>
            )}
            {upcomingMatches.map((m) => (
              <ScheduleCard key={m.match_id} match={m} onClick={setSelectedMatch} />
            ))}
          </section>
        )}

        <p className="text-xs text-gray-700 text-center pb-2">
          カードをタップで詳細表示 ／ データ提供: vlr.gg
        </p>
      </div>

      {/* モーダル */}
      {selectedMatch && (
        <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </main>
  );
}
