"use client";

import { useEffect, useState } from "react";

type DayTrend = {
  date: string;
  accuracy: number | null;
  correct: number;
  total: number;
};

type TrendData = {
  trend: DayTrend[];
  overall_accuracy: number | null;
  overall_correct: number;
  overall_total: number;
};

export default function AccuracyTrend() {
  const [data, setData] = useState<TrendData | null>(null);

  useEffect(() => {
    fetch("/api/accuracy-trend?days=7")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return null;

  const maxTotal = Math.max(...data.trend.map((d) => d.total), 1);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          週次 AI 精度トレンド
        </h3>
        {data.overall_accuracy !== null && (
          <div className="text-right">
            <span className={`text-lg font-black tabular-nums ${
              data.overall_accuracy >= 0.65 ? "text-green-400" :
              data.overall_accuracy >= 0.5  ? "text-yellow-400" : "text-red-400"
            }`}>
              {(data.overall_accuracy * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-gray-600 ml-1">
              ({data.overall_correct}/{data.overall_total})
            </span>
          </div>
        )}
      </div>

      {/* バーグラフ */}
      <div className="flex items-end gap-1.5 h-16">
        {data.trend.map((d) => {
          const mm = d.date.slice(5, 7);
          const dd = d.date.slice(8, 10);
          const hasData = d.accuracy !== null && d.total > 0;
          const barH = hasData ? Math.max(8, (d.total / maxTotal) * 100) : 0;
          const color =
            !hasData ? "bg-gray-800" :
            d.accuracy! >= 0.65 ? "bg-green-500" :
            d.accuracy! >= 0.5  ? "bg-yellow-500" : "bg-red-500";

          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end" style={{ height: "48px" }}>
                {hasData && (
                  <div
                    className={`w-full rounded-sm ${color} opacity-80`}
                    style={{ height: `${barH}%` }}
                    title={`${d.date}: ${(d.accuracy! * 100).toFixed(0)}% (${d.correct}/${d.total})`}
                  />
                )}
                {!hasData && (
                  <div className="w-full h-1 bg-gray-800 rounded-sm" />
                )}
              </div>
              <span className="text-xs text-gray-600 tabular-nums">{mm}/{dd}</span>
              {hasData && (
                <span className={`text-xs font-bold tabular-nums ${color.replace("bg-", "text-")}`}>
                  {(d.accuracy! * 100).toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-700">※ 拮抗（45〜55%）試合を除いた的中率</p>
    </div>
  );
}
