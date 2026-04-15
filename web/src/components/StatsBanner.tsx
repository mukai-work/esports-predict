"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  match_count: number;
  team_count: number;
  accuracy_7d: number | null;
  correct_7d: number;
  total_7d: number;
};

export default function StatsBanner() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="h-16 bg-gray-900 rounded-xl animate-pulse" />
    );
  }

  const items = [
    {
      value: stats.match_count.toLocaleString(),
      label: "試合分析済み",
      href: null,
    },
    {
      value: stats.team_count.toLocaleString(),
      label: "チーム登録",
      href: "/rankings",
    },
    {
      value: stats.accuracy_7d !== null
        ? `${(stats.accuracy_7d * 100).toFixed(0)}%`
        : "—",
      label: "直近7日の的中率",
      href: "/results",
      color: stats.accuracy_7d !== null
        ? stats.accuracy_7d >= 0.65 ? "text-green-400"
        : stats.accuracy_7d >= 0.5 ? "text-yellow-400"
        : "text-red-400"
        : "text-gray-500",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-gray-900 border border-gray-800 rounded-xl px-4 sm:px-6 py-3 sm:py-4">
      {items.map(({ value, label, href, color }) => {
        const inner = (
          <div className="text-center">
            <p className={`text-xl sm:text-2xl font-black tabular-nums ${color ?? "text-white"}`}>
              {value}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        );
        return href ? (
          <Link key={label} href={href} className="hover:opacity-80 transition-opacity">
            {inner}
          </Link>
        ) : (
          <div key={label}>{inner}</div>
        );
      })}
    </div>
  );
}
