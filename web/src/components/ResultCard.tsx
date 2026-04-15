import Link from "next/link";

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
  is_tossup: boolean;
};

type Props = { match: MatchResult };

export default function ResultCard({ match: m }: Props) {
  const team1Won = m.winner && m.winner.toLowerCase().includes(m.team1.toLowerCase());
  const team2Won = m.winner && m.winner.toLowerCase().includes(m.team2.toLowerCase());

  const predResult =
    m.is_tossup
      ? { mark: "–", label: "拮抗", cls: "text-gray-400" }
      : m.prediction_correct === true
      ? { mark: "✅", label: "的中", cls: "text-green-400" }
      : m.prediction_correct === false
      ? { mark: "❌", label: "外れ", cls: "text-red-400" }
      : null;

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden hover:border-gray-600 transition-colors">
      {/* 時刻 + イベント */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs text-gray-600 truncate flex-1">{m.event}</span>
        <span className="text-xs text-gray-500 ml-2 shrink-0 tabular-nums">{m.match_time_jst} JST</span>
      </div>

      {/* スコア本体 */}
      <div className="px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Team 1 */}
        <div className={`text-right ${team1Won ? "opacity-100" : "opacity-40"}`}>
          <Link
            href={`/team/${encodeURIComponent(m.team1)}`}
            className={`font-bold text-sm leading-tight hover:underline ${team1Won ? "text-white" : "text-gray-400"}`}
          >
            {m.team1}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5">
            予想 {(m.team1_win_prob * 100).toFixed(0)}%
          </p>
        </div>

        {/* スコア中央 → 試合詳細リンク */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          <Link href={`/match/${m.match_id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className={`text-2xl font-black tabular-nums ${team1Won ? "text-white" : "text-gray-500"}`}>
              {m.score1}
            </span>
            <span className="text-gray-700 text-sm">:</span>
            <span className={`text-2xl font-black tabular-nums ${team2Won ? "text-white" : "text-gray-500"}`}>
              {m.score2}
            </span>
          </Link>
          {/* 予想結果マーク */}
          {predResult && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${predResult.cls}`}>
              <span>{predResult.mark}</span>
              <span>{predResult.label}</span>
            </div>
          )}
        </div>

        {/* Team 2 */}
        <div className={`${team2Won ? "opacity-100" : "opacity-40"}`}>
          <Link
            href={`/team/${encodeURIComponent(m.team2)}`}
            className={`font-bold text-sm leading-tight hover:underline ${team2Won ? "text-white" : "text-gray-400"}`}
          >
            {m.team2}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5">
            予想 {(m.team2_win_prob * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* マップ別スコア */}
      {m.maps.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {m.maps.map((mp, i) => {
            const s1 = parseInt(mp.score1 ?? "0");
            const s2 = parseInt(mp.score2 ?? "0");
            const t1win = s1 > s2;
            return (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                <span className={t1win ? "text-white font-semibold" : ""}>{mp.score1}</span>
                <span className="text-gray-600 mx-0.5">–</span>
                <span className={!t1win ? "text-white font-semibold" : ""}>{mp.score2}</span>
                <span className="text-gray-600 ml-1">{mp.map}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
