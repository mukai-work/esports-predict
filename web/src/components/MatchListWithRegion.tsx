"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RegionTabs, { Region } from "@/components/RegionTabs";

type MapResult = { map: string; score1: string; score2: string };

type Match = {
  match_id: string;
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  winner: string;
  event: string;
  map_count: number;
  maps: MapResult[];
};

export default function MatchListWithRegion() {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [region, setRegion] = useState<Region>("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matches?limit=60")
      .then((r) => r.json())
      .then((d) => setAllMatches(d.matches ?? []))
      .finally(() => setLoading(false));
  }, []);

  function detectRegion(event: string): string {
    const e = event.toUpperCase();
    if (/AMERICAS|NORTH AMERICA|\bNA\b|BRAZIL|LATIN/.test(e)) return "Americas";
    if (/EMEA|EUROPE|TURKEY|SPAIN|GERMANY|FRANCE|BENELUX|NORDIC|DACH|\bUK\b/.test(e)) return "EMEA";
    if (/PACIFIC|APAC|JAPAN|KOREA|\bSEA\b|OCEANIA|SOUTH ASIA/.test(e)) return "Pacific";
    if (/CHINA|\bCN\b|BILIBILI/.test(e)) return "China";
    return "Other";
  }

  const counts = allMatches.reduce<Partial<Record<Region, number>>>((acc, m) => {
    const r = detectRegion(m.event) as Region;
    acc[r] = (acc[r] ?? 0) + 1;
    acc["All"] = (acc["All"] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = region === "All"
    ? allMatches
    : allMatches.filter((m) => detectRegion(m.event) === region);

  if (loading) {
    return <div className="h-60 bg-gray-900 rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <RegionTabs selected={region} onChange={setRegion} counts={counts} />

      {filtered.length === 0 && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-8 text-center text-gray-500 text-sm">
          このリージョンの試合データがありません
        </div>
      )}

      <div className="space-y-3">
        {filtered.slice(0, 20).map((m) => (
          <div
            key={m.match_id}
            className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-4 hover:border-gray-600 hover:bg-gray-800/50 transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-right">
                <Link
                  href={`/team/${encodeURIComponent(m.team1)}`}
                  className={`font-semibold hover:text-red-400 transition-colors ${m.winner === m.team1 ? "text-white" : "text-gray-500 opacity-60"}`}
                >
                  {m.team1}
                </Link>
              </div>
              <Link href={`/match/${m.match_id}`} className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
                <span className={`text-2xl font-black tabular-nums ${m.winner === m.team1 ? "text-green-400" : "text-gray-600"}`}>
                  {m.score1}
                </span>
                <span className="text-gray-700 text-sm font-light">–</span>
                <span className={`text-2xl font-black tabular-nums ${m.winner === m.team2 ? "text-green-400" : "text-gray-600"}`}>
                  {m.score2}
                </span>
              </Link>
              <div className="flex-1">
                <Link
                  href={`/team/${encodeURIComponent(m.team2)}`}
                  className={`font-semibold hover:text-red-400 transition-colors ${m.winner === m.team2 ? "text-white" : "text-gray-500 opacity-60"}`}
                >
                  {m.team2}
                </Link>
              </div>
            </div>

            {m.maps.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.maps.map((mp, i) => {
                  const s1 = parseInt(mp.score1 ?? "0");
                  const s2 = parseInt(mp.score2 ?? "0");
                  const t1w = s1 > s2;
                  return (
                    <span key={i} className="text-xs bg-gray-800 border border-gray-700/50 px-2.5 py-1 rounded-md text-gray-300 font-medium">
                      <span className={t1w ? "text-green-400 font-bold" : ""}>{mp.score1}</span>
                      <span className="text-gray-600 mx-1">–</span>
                      <span className={!t1w ? "text-green-400 font-bold" : ""}>{mp.score2}</span>
                      <span className="text-gray-500 ml-1.5">{mp.map}</span>
                    </span>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-600 truncate">{m.event}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
