import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import { fetchTeamStats } from "@/lib/data";

export const metadata: Metadata = {
  title: "チームランキング",
  description: "Valorant VCT プロチームの勝率ランキング。直近の成績から強豪チームを把握できます。",
};

// 15分毎に再検証
export const revalidate = 900;

function getTierLabel(winRate: number): { label: string; color: string } {
  if (winRate >= 0.70) return { label: "S", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" };
  if (winRate >= 0.58) return { label: "A", color: "text-green-400 bg-green-400/10 border-green-400/30" };
  if (winRate >= 0.48) return { label: "B", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" };
  if (winRate >= 0.38) return { label: "C", color: "text-gray-400 bg-gray-400/10 border-gray-400/30" };
  return { label: "D", color: "text-red-400 bg-red-400/10 border-red-400/30" };
}

export default async function RankingsPage() {
  const allTeams = await fetchTeamStats();

  // 最低10試合以上のチームをランキング対象にする
  const ranked = allTeams
    .filter((t) => t.matches >= 10)
    .sort((a, b) => b.win_rate - a.win_rate);

  const minMatches5 = allTeams.filter((t) => t.matches >= 5 && t.matches < 10)
    .sort((a, b) => b.win_rate - a.win_rate);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* タイトル */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
            チームランキング
          </h2>
          <p className="text-xs text-gray-600">
            勝率順（10試合以上）· 全 {allTeams.length} チーム登録
          </p>
        </div>

        {/* メインランキング */}
        <section>
          <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
            {/* ヘッダー行 */}
            <div className="grid grid-cols-[3rem_1fr_5rem_5rem_5rem_4rem] gap-2 px-4 py-3 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
              <span className="text-center">#</span>
              <span>チーム</span>
              <span className="text-right">試合数</span>
              <span className="text-right">勝</span>
              <span className="text-right">敗</span>
              <span className="text-right">勝率</span>
            </div>

            {ranked.map((team, i) => {
              const tier = getTierLabel(team.win_rate);
              const isTop3 = i < 3;
              return (
                <Link
                  key={team.team}
                  href={`/team/${encodeURIComponent(team.team)}`}
                  className="grid grid-cols-[3rem_1fr_5rem_5rem_5rem_4rem] gap-2 px-4 py-3 border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors items-center group"
                >
                  {/* 順位 */}
                  <span className={`text-center font-bold text-sm tabular-nums ${
                    i === 0 ? "text-yellow-400" :
                    i === 1 ? "text-gray-300" :
                    i === 2 ? "text-amber-600" :
                    "text-gray-600"
                  }`}>
                    {i + 1}
                  </span>

                  {/* チーム名 + ティア */}
                  <div className="flex items-center gap-2 min-w-0">
                    {isTop3 && (
                      <span className="text-base leading-none">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                      </span>
                    )}
                    <span className="text-sm font-medium text-white group-hover:text-red-400 transition-colors truncate">
                      {team.team}
                    </span>
                    <span className={`text-xs border px-1.5 py-0.5 rounded font-bold shrink-0 ${tier.color}`}>
                      {tier.label}
                    </span>
                  </div>

                  {/* 試合数 */}
                  <span className="text-right text-xs text-gray-500 tabular-nums">
                    {team.matches}
                  </span>

                  {/* 勝 */}
                  <span className="text-right text-xs text-green-400 tabular-nums font-semibold">
                    {team.wins}
                  </span>

                  {/* 敗 */}
                  <span className="text-right text-xs text-gray-500 tabular-nums">
                    {team.losses}
                  </span>

                  {/* 勝率 */}
                  <div className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${
                      team.win_rate >= 0.6 ? "text-green-400" :
                      team.win_rate >= 0.4 ? "text-gray-300" : "text-red-400"
                    }`}>
                      {(team.win_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                </Link>
              );
            })}

            {ranked.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                データなし
              </div>
            )}
          </div>
        </section>

        {/* 少数試合チーム (5-9試合) */}
        {minMatches5.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              参考：5〜9試合チーム（{minMatches5.length}チーム）
            </h3>
            <div className="rounded-xl bg-gray-900/50 border border-gray-800/50 overflow-hidden">
              {minMatches5.slice(0, 20).map((team) => {
                const tier = getTierLabel(team.win_rate);
                return (
                  <Link
                    key={team.team}
                    href={`/team/${encodeURIComponent(team.team)}`}
                    className="grid grid-cols-[1fr_5rem_5rem_5rem_4rem] gap-2 px-4 py-2.5 border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors items-center group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 group-hover:text-red-400 transition-colors truncate">
                        {team.team}
                      </span>
                      <span className={`text-xs border px-1 py-0.5 rounded font-bold shrink-0 ${tier.color}`}>
                        {tier.label}
                      </span>
                    </div>
                    <span className="text-right text-xs text-gray-600 tabular-nums">{team.matches}</span>
                    <span className="text-right text-xs text-green-500 tabular-nums">{team.wins}</span>
                    <span className="text-right text-xs text-gray-600 tabular-nums">{team.losses}</span>
                    <span className={`text-right text-xs font-bold tabular-nums ${
                      team.win_rate >= 0.6 ? "text-green-400" :
                      team.win_rate >= 0.4 ? "text-gray-400" : "text-red-400"
                    }`}>
                      {(team.win_rate * 100).toFixed(0)}%
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ティア説明 */}
        <section className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">ティア基準</h3>
          <div className="grid grid-cols-5 gap-2 text-xs text-center">
            {[
              { tier: "S", label: "70%+", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
              { tier: "A", label: "58-70%", color: "text-green-400 bg-green-400/10 border-green-400/30" },
              { tier: "B", label: "48-58%", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
              { tier: "C", label: "38-48%", color: "text-gray-400 bg-gray-400/10 border-gray-400/30" },
              { tier: "D", label: "38%未満", color: "text-red-400 bg-red-400/10 border-red-400/30" },
            ].map(({ tier, label, color }) => (
              <div key={tier} className={`border rounded-lg py-2 ${color}`}>
                <div className="font-bold text-base">{tier}</div>
                <div className="text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-gray-700 text-center pb-4">
          データ提供: vlr.gg ／ 勝率は記録された全試合に基づきます
        </p>
      </div>
    </main>
  );
}
