"use client";

const DAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  selected: string;           // "YYYY-MM-DD" JST
  onChange: (date: string) => void;
  matchCounts?: Record<string, number>;
  daysBack?: number;
};

function formatJST(offsetDays: number): { dateStr: string; dayLabel: string; dateNum: number } {
  // 現在 UTC + 9h = JST
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 3600 * 1000);
  const target = new Date(jstNow.getTime() + offsetDays * 24 * 3600 * 1000);

  const yyyy = target.getUTCFullYear();
  const mm = String(target.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(target.getUTCDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const dayOfWeek = target.getUTCDay();
  const dayLabel = offsetDays === 0 ? "今日" : DAYS_JP[dayOfWeek];
  return { dateStr, dayLabel, dateNum: target.getUTCDate() };
}

export default function DateCalendar({ selected, onChange, matchCounts = {}, daysBack = 7 }: Props) {
  // 左: 古い日 → 右: 今日
  const days = Array.from({ length: daysBack + 1 }, (_, i) => formatJST(i - daysBack));

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {days.map(({ dateStr, dayLabel, dateNum }) => {
        const isSelected = selected === dateStr;
        const count = matchCounts[dateStr];
        const isToday = dayLabel === "今日";
        const isSat = !isToday && new Date(dateStr + "T12:00:00+09:00").getDay() === 6;
        const isSun = !isToday && new Date(dateStr + "T12:00:00+09:00").getDay() === 0;

        return (
          <button
            key={dateStr}
            onClick={() => onChange(dateStr)}
            className={`flex flex-col items-center px-3 py-2 rounded-xl shrink-0 transition-all ${
              isSelected
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                : "bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            <span className={`text-xs font-medium mb-0.5 ${
              isSelected ? "text-red-200" :
              isSat ? "text-blue-400" :
              isSun ? "text-red-400" :
              isToday ? "text-yellow-400" : "text-gray-500"
            }`}>
              {dayLabel}
            </span>
            <span className="text-base font-bold tabular-nums leading-none">{dateNum}</span>
            {count !== undefined && (
              <span className={`text-xs mt-1 tabular-nums ${isSelected ? "text-red-200" : "text-gray-600"}`}>
                {count}試合
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
