"use client";

import { useEffect, useState } from "react";
import ScheduleCard from "@/components/ScheduleCard";
import MatchModal from "@/components/MatchModal";
import RegionTabs, { Region } from "@/components/RegionTabs";
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

export default function SchedulePage() {
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<Region>("All");
  const [selectedMatch, setSelectedMatch] = useState<ScheduleMatch | null>(null);

  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = region === "All" ? matches : matches.filter((m) => m.region === region);

  const counts = matches.reduce<Partial<Record<Region, number>>>((acc, m) => {
    const r = m.region as Region;
    acc[r] = (acc[r] ?? 0) + 1;
    acc["All"] = (acc["All"] ?? 0) + 1;
    return acc;
  }, {});

  const liveMatches = filtered.filter((m) => m.status === "live");
  const upcomingMatches = filtered.filter((m) => m.status !== "live");

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center font-bold text-sm">V</div>
          <div>
            <h1 className="text-lg font-bold leading-none">Valorant AI Predictor</h1>
            <p className="text-xs text-gray-400">VCT プロ試合 AI 勝敗予想</p>
          </div>
          <nav className="ml-auto flex gap-4 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">ホーム</Link>
            <Link href="/schedule" className="text-white font-semibold border-b border-red-500">スケジュール</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            試合スケジュール & AI 予想
          </h2>
          <RegionTabs selected={region} onChange={setRegion} counts={counts} />
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

        {liveMatches.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">● NOW LIVE</h3>
            {liveMatches.map((m) => (
              <ScheduleCard key={m.match_id} match={m} onClick={setSelectedMatch} />
            ))}
          </section>
        )}

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

        <p className="text-xs text-gray-700 text-center">
          カードをタップで選手情報を表示 ／ データ提供: vlr.gg
        </p>
      </div>

      {/* モーダル */}
      {selectedMatch && (
        <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </main>
  );
}
