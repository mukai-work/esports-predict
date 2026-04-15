"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DateCalendar from "@/components/DateCalendar";
import ResultCard from "@/components/ResultCard";
import RegionTabs, { Region } from "@/components/RegionTabs";

type MapResult = { map: string; score1: string; score2: string };

type MatchResult = {
  match_id: string;
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  winner: string;
  event: string;
  maps: MapResult[];
  team1_url: string;
  team2_url: string;
  match_time_jst: string;
  team1_win_prob: number;
  team2_win_prob: number;
  predicted_winner: string;
  prediction_correct: boolean | null;
};

type DayResult = {
  date: string;
  match_count: number;
  correct_count: number;
  accuracy: number | null;
  matches: MatchResult[];
};

function detectRegion(event: string): string {
  const e = event.toUpperCase();
  if (/AMERICAS|NORTH AMERICA|\bNA\b|BRAZIL|LATIN/.test(e)) return "Americas";
  if (/EMEA|EUROPE|TURKEY|SPAIN|GERMANY|FRANCE|BENELUX|NORDIC|DACH|\bUK\b/.test(e)) return "EMEA";
  if (/PACIFIC|APAC|JAPAN|KOREA|\bSEA\b|OCEANIA|SOUTH ASIA/.test(e)) return "Pacific";
  if (/CHINA|\bCN\b|BILIBILI/.test(e)) return "China";
  return "Other";
}

function todayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  return jst.toISOString().slice(0, 10);
}

// 直近 N 日のデータを先読みして試合数を取得
async function fetchMatchCounts(days: number): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const today = todayJST();
  const requests = Array.from({ length: days + 1 }, (_, i) => {
    const jst = new Date(new Date(today + "T12:00:00+09:00").getTime() - i * 24 * 3600 * 1000);
    const d = jst.toISOString().slice(0, 10);
    return fetch(`/api/results?date=${d}`)
      .then((r) => r.json())
      .then((data) => { if (data.match_count > 0) counts[d] = data.match_count; })
      .catch(() => {});
  });
  await Promise.all(requests);
  return counts;
}

export default function ResultsPage() {
  const [selectedDate, setSelectedDate] = useState(todayJST());
  const [dayData, setDayData] = useState<DayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [region, setRegion] = useState<Region>("All");

  // 直近7日の試合数を先読み
  useEffect(() => {
    fetchMatchCounts(7).then(setMatchCounts);
  }, []);

  // 選択日のデータを取得
  const fetchDay = useCallback(async (date: string) => {
    setLoading(true);
    setDayData(null);
    try {
      const r = await fetch(`/api/results?date=${date}`);
      const data = await r.json();
      setDayData(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDay(selectedDate);
  }, [selectedDate, fetchDay]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setRegion("All");
  };

  const filtered = dayData?.matches.filter(
    (m) => region === "All" || detectRegion(m.event) === region
  ) ?? [];

  const regionCounts = dayData?.matches.reduce<Partial<Record<Region, number>>>((acc, m) => {
    const r = detectRegion(m.event) as Region;
    acc[r] = (acc[r] ?? 0) + 1;
    acc["All"] = (acc["All"] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  const correctInView = filtered.filter((m) => m.prediction_correct === true).length;
  const finishedInView = filtered.filter((m) => m.prediction_correct !== null).length;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center font-bold text-sm">V</div>
          <div>
            <h1 className="text-lg font-bold leading-none">Valorant AI Predictor</h1>
            <p className="text-xs text-gray-400">VCT プロ試合 AI 勝敗予想</p>
          </div>
          <nav className="ml-auto flex gap-4 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">ホーム</Link>
            <Link href="/schedule" className="text-gray-400 hover:text-white transition-colors">スケジュール</Link>
            <Link href="/results" className="text-white font-semibold border-b border-red-500">結果</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* カレンダー */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            日付を選択
          </h2>
          <DateCalendar
            selected={selectedDate}
            onChange={handleDateChange}
            matchCounts={matchCounts}
            daysBack={7}
          />
        </section>

        {/* サマリーバー */}
        {dayData && dayData.match_count > 0 && (
          <div className="flex items-center justify-between bg-gray-900 rounded-xl px-5 py-3 border border-gray-800">
            <div>
              <span className="text-xs text-gray-500 mr-2">
                {selectedDate.replace(/-/g, "/")}（JST）
              </span>
              <span className="text-sm text-white font-semibold">{dayData.match_count} 試合</span>
            </div>
            {dayData.accuracy !== null && (
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">AI 予想的中率</p>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dayData.accuracy >= 0.6 ? "bg-green-500" :
                        dayData.accuracy >= 0.4 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${dayData.accuracy * 100}%` }}
                    />
                  </div>
                  <span className={`text-base font-bold tabular-nums ${
                    dayData.accuracy >= 0.6 ? "text-green-400" :
                    dayData.accuracy >= 0.4 ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {(dayData.accuracy * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-gray-500">
                    ({dayData.correct_count}/{dayData.match_count})
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* リージョンフィルタ */}
        {dayData && dayData.match_count > 0 && (
          <RegionTabs selected={region} onChange={setRegion} counts={regionCounts} />
        )}

        {/* フィルタ後の的中率 */}
        {region !== "All" && finishedInView > 0 && (
          <p className="text-xs text-gray-500">
            {region} 的中率: <span className="text-white font-semibold">{correctInView}/{finishedInView}</span>
            （{((correctInView / finishedInView) * 100).toFixed(0)}%）
          </p>
        )}

        {/* 試合カード一覧 */}
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && dayData && dayData.match_count === 0 && (
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-10 text-center text-gray-500 text-sm">
            この日の試合データはありません
          </div>
        )}

        {!loading && filtered.length === 0 && dayData && dayData.match_count > 0 && (
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-8 text-center text-gray-500 text-sm">
            このリージョンの試合はありません
          </div>
        )}

        {!loading && (
          <div className="space-y-3">
            {filtered.map((m) => (
              <ResultCard key={m.match_id} match={m} />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-700 text-center pb-4">
          AI 予想は現時点の通算勝率に基づきます ／ データ提供: vlr.gg
        </p>
      </div>
    </main>
  );
}
