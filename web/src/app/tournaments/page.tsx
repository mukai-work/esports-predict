import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "大会一覧",
  description: "Valorant VCT 大会・トーナメント一覧。各大会の試合結果と参加チームを確認できます。",
};

export const revalidate = 1800;

const REGION_COLOR: Record<string, string> = {
  Pacific:  "text-blue-400 bg-blue-400/10 border-blue-400/30",
  Americas: "text-green-400 bg-green-400/10 border-green-400/30",
  EMEA:     "text-purple-400 bg-purple-400/10 border-purple-400/30",
  China:    "text-orange-400 bg-orange-400/10 border-orange-400/30",
  Other:    "text-gray-400 bg-gray-400/10 border-gray-400/30",
};

type TournamentMatch = {
  match_id: string;
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  winner: string;
};

type Tournament = {
  event: string;
  region: string;
  match_count: number;
  matches: TournamentMatch[];
};

async function fetchTournaments(): Promise<Tournament[]> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/tournaments`, {
      next: { revalidate: 1800 },
    });
    const data = await res.json();
    return data.tournaments ?? [];
  } catch {
    return [];
  }
}

export default async function TournamentsPage() {
  const tournaments = await fetchTournaments();

  const byRegion: Record<string, Tournament[]> = {};
  for (const t of tournaments) {
    const r = t.region;
    if (!byRegion[r]) byRegion[r] = [];
    byRegion[r].push(t);
  }

  const regionOrder = ["Americas", "EMEA", "Pacific", "China", "Other"];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
            大会一覧
          </h2>
          <p className="text-xs text-gray-600">
            直近 200 試合のデータから {tournaments.length} 大会を検出
          </p>
        </div>

        {tournaments.length === 0 && (
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-12 text-center text-gray-500 text-sm">
            大会データがありません
          </div>
        )}

        {regionOrder.map((region) => {
          const events = byRegion[region];
          if (!events || events.length === 0) return null;
          const colorCls = REGION_COLOR[region] ?? REGION_COLOR.Other;

          return (
            <section key={region} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs border px-2 py-0.5 rounded font-bold ${colorCls}`}>
                  {region}
                </span>
                <span className="text-xs text-gray-600">{events.length} 大会</span>
              </div>

              <div className="space-y-2">
                {events.map((t) => (
                  <div
                    key={t.event}
                    className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
                  >
                    {/* 大会ヘッダー */}
                    <div className="px-5 py-3 flex items-center justify-between border-b border-gray-800/60">
                      <h3 className="text-sm font-bold text-white truncate flex-1 mr-4">
                        {t.event}
                      </h3>
                      <span className="text-xs text-gray-500 shrink-0">
                        {t.match_count} 試合
                      </span>
                    </div>

                    {/* 直近試合リスト */}
                    <div className="divide-y divide-gray-800/40">
                      {t.matches.map((m) => {
                        const t1won = m.winner?.toLowerCase().includes(m.team1?.toLowerCase());
                        const t2won = m.winner?.toLowerCase().includes(m.team2?.toLowerCase());
                        return (
                          <Link
                            key={m.match_id}
                            href={`/match/${m.match_id}`}
                            className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-800/40 transition-colors"
                          >
                            <span className={`text-sm font-bold text-right flex-1 truncate ${t1won ? "text-white" : "text-gray-500"}`}>
                              {m.team1}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-sm font-black tabular-nums ${t1won ? "text-green-400" : "text-gray-500"}`}>
                                {m.score1}
                              </span>
                              <span className="text-gray-700 text-xs">–</span>
                              <span className={`text-sm font-black tabular-nums ${t2won ? "text-green-400" : "text-gray-500"}`}>
                                {m.score2}
                              </span>
                            </div>
                            <span className={`text-sm font-bold flex-1 truncate ${t2won ? "text-white" : "text-gray-500"}`}>
                              {m.team2}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <p className="text-xs text-gray-700 text-center pb-4">データ提供: vlr.gg</p>
      </div>
    </main>
  );
}
