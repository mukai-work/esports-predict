// Server Component — ビルド時にデータを読み込む

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

async function getMatches(): Promise<Match[]> {
  const res = await fetch("http://localhost:3000/api/matches?limit=15", {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.matches ?? [];
}

export default async function MatchList() {
  const matches = await getMatches();

  if (matches.length === 0) {
    return (
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-8 text-center text-gray-500 text-sm">
        試合データがありません。<code className="bg-gray-800 px-1 rounded">python scripts/fetch_all.py</code> を実行してください。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((m) => (
        <div
          key={m.match_id}
          className="rounded-xl bg-gray-900 border border-gray-800 px-5 py-4"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Team 1 */}
            <div className={`flex-1 text-right ${m.winner === m.team1 ? "text-white font-semibold" : "text-gray-400"}`}>
              {m.team1}
            </div>

            {/* Score */}
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xl font-bold tabular-nums ${m.winner === m.team1 ? "text-green-400" : "text-gray-400"}`}>
                {m.score1}
              </span>
              <span className="text-gray-600 text-sm">:</span>
              <span className={`text-xl font-bold tabular-nums ${m.winner === m.team2 ? "text-green-400" : "text-gray-400"}`}>
                {m.score2}
              </span>
            </div>

            {/* Team 2 */}
            <div className={`flex-1 ${m.winner === m.team2 ? "text-white font-semibold" : "text-gray-400"}`}>
              {m.team2}
            </div>
          </div>

          {/* Maps */}
          {m.maps.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {m.maps.map((mp, i) => (
                <span key={i} className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                  {mp.map} {mp.score1}–{mp.score2}
                </span>
              ))}
            </div>
          )}

          {/* Event */}
          <p className="mt-1 text-xs text-gray-600 truncate">{m.event}</p>
        </div>
      ))}
    </div>
  );
}
