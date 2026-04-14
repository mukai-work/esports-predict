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

type Props = { match: ScheduleMatch };

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  live:     { label: "● LIVE",    cls: "text-red-400 animate-pulse" },
  upcoming: { label: "UPCOMING",  cls: "text-gray-500" },
  tbd:      { label: "TBD",       cls: "text-yellow-600" },
};

const REGION_COLOR: Record<string, string> = {
  Pacific:  "text-blue-400",
  Americas: "text-green-400",
  EMEA:     "text-purple-400",
  China:    "text-orange-400",
  Other:    "text-gray-500",
};

export default function ScheduleCard({ match: m }: Props) {
  const status = STATUS_LABEL[m.status] ?? STATUS_LABEL.upcoming;
  const regionCls = REGION_COLOR[m.region] ?? "text-gray-500";

  return (
    <a
      href={m.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl bg-gray-900 border border-gray-800 px-5 py-4 hover:border-gray-600 transition-colors"
    >
      {/* ヘッダー行 */}
      <div className="flex justify-between items-center mb-3">
        <span className={`text-xs font-bold ${status.cls}`}>{status.label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${regionCls}`}>{m.region}</span>
          {m.match_time && (
            <span className="text-xs text-gray-600">{m.match_time}</span>
          )}
        </div>
      </div>

      {/* チーム vs チーム */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Team 1 */}
        <div className="text-right">
          <p className={`font-semibold text-sm leading-tight ${m.predicted_winner === m.team1 ? "text-white" : "text-gray-400"}`}>
            {m.team1}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{(m.team1_win_prob * 100).toFixed(0)}%</p>
        </div>

        {/* 確率バー */}
        <div className="flex flex-col items-center gap-1 w-28">
          <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-gray-800">
            <div
              className="bg-red-500 h-full transition-all duration-500"
              style={{ width: `${m.team1_win_prob * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">vs</span>
        </div>

        {/* Team 2 */}
        <div>
          <p className={`font-semibold text-sm leading-tight ${m.predicted_winner === m.team2 ? "text-white" : "text-gray-400"}`}>
            {m.team2}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{(m.team2_win_prob * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* イベント */}
      <p className="mt-2 text-xs text-gray-600 truncate">{m.event}</p>
    </a>
  );
}
