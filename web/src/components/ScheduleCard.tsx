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

type Props = {
  match: ScheduleMatch;
  onClick: (match: ScheduleMatch) => void;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  live:     { label: "● LIVE",   cls: "text-red-400 animate-pulse" },
  upcoming: { label: "UPCOMING", cls: "text-gray-500" },
  tbd:      { label: "TBD",      cls: "text-yellow-600" },
};

const REGION_COLOR: Record<string, string> = {
  Pacific:  "text-blue-400",
  Americas: "text-green-400",
  EMEA:     "text-purple-400",
  China:    "text-orange-400",
  Other:    "text-gray-500",
};

// 予想根拠のラベル（信頼度を示す簡易表示）
function PredictionBasis({ prob }: { prob: number }) {
  const diff = Math.abs(prob - 0.5);
  const strength =
    diff >= 0.3 ? { label: "強", cls: "text-red-400 bg-red-500/10" } :
    diff >= 0.15 ? { label: "中", cls: "text-yellow-500 bg-yellow-500/10" } :
    { label: "拮抗", cls: "text-gray-400 bg-gray-700/50" };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${strength.cls}`}>
      {strength.label}
    </span>
  );
}

export default function ScheduleCard({ match: m, onClick }: Props) {
  const status = STATUS_LABEL[m.status] ?? STATUS_LABEL.upcoming;
  const regionCls = REGION_COLOR[m.region] ?? "text-gray-500";

  return (
    <button
      type="button"
      onClick={() => onClick(m)}
      className="w-full text-left rounded-xl bg-gray-900 border border-gray-800 px-5 py-4 hover:border-red-500/40 hover:bg-gray-800/60 hover:shadow-[0_0_16px_rgba(239,68,68,0.08)] transition-all duration-200 cursor-pointer"
    >
      {/* ヘッダー行 */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${status.cls}`}>{status.label}</span>
          <PredictionBasis prob={m.team1_win_prob} />
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${regionCls}`}>{m.region}</span>
          {m.match_time && m.status !== "live" && (
            <span className="text-xs text-gray-400 tabular-nums">
              {m.match_time}
              <span className="text-gray-600 ml-0.5">JST</span>
            </span>
          )}
        </div>
      </div>

      {/* チーム vs チーム */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Team 1 */}
        <div className="text-right">
          <Link
            href={`/team/${encodeURIComponent(m.team1)}`}
            onClick={(e) => e.stopPropagation()}
            className={`font-semibold text-sm leading-tight hover:underline ${m.predicted_winner === m.team1 ? "text-white" : "text-gray-400"}`}
          >
            {m.team1}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{(m.team1_win_prob * 100).toFixed(0)}%</p>
        </div>

        {/* 確率バー: 左(team1)=緑 右(team2)=赤 */}
        <div className="flex flex-col items-center gap-1 w-28">
          <div className="flex w-full h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                m.team1_win_prob > 0.6
                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                  : "bg-green-700"
              }`}
              style={{ width: `${m.team1_win_prob * 100}%` }}
            />
            <div className={`h-full flex-1 ${
              m.team2_win_prob > 0.6
                ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                : "bg-red-900"
            }`} />
          </div>
          <span className="text-xs text-gray-600">vs</span>
        </div>

        {/* Team 2 */}
        <div>
          <Link
            href={`/team/${encodeURIComponent(m.team2)}`}
            onClick={(e) => e.stopPropagation()}
            className={`font-semibold text-sm leading-tight hover:underline ${m.predicted_winner === m.team2 ? "text-white" : "text-gray-400"}`}
          >
            {m.team2}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{(m.team2_win_prob * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* イベント + タップヒント */}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-600 truncate flex-1">{m.event}</p>
        <span className="text-xs text-gray-700 ml-2 shrink-0">詳細 ›</span>
      </div>
    </button>
  );
}
