"use client";

import { useEffect, useRef, useState } from "react";

type PlayerEntry = {
  name: string;
  agent: string;
  acs: number;
  adr: number;
  hs_pct: number;
  rating: number;
  matches: number;
};

type MapStat = { map: string; win_rate: number; played: number };

type RecentMatch = {
  match_id: string;
  opponent: string;
  score: string;
  won: boolean;
  event: string;
};

type TeamDetail = {
  team: string;
  players: PlayerEntry[];
  recent_matches: RecentMatch[];
  map_stats: MapStat[];
  vlr_url: string;
  total_matches: number;
};

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
  onClose: () => void;
};

function TeamPanel({ teamName, prob }: { teamName: string; prob: number }) {
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/team-detail?team=${encodeURIComponent(teamName)}`)
      .then((r) => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [teamName]);

  return (
    <div className="flex-1 min-w-0">
      {/* チーム名 + 勝率 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-white text-sm leading-tight">{teamName}</h3>
        <span className="text-lg font-bold text-red-400 tabular-nums">{(prob * 100).toFixed(0)}%</span>
      </div>

      {loading && <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-gray-800 rounded animate-pulse" />)}</div>}

      {detail && (
        <div className="space-y-4">
          {/* 選手一覧 */}
          {detail.players.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">選手スタッツ（平均）</p>
              <div className="space-y-1.5">
                {detail.players.slice(0, 5).map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 w-16 shrink-0 truncate">{p.agent || "—"}</span>
                    <span className="text-gray-200 flex-1 truncate">{p.name}</span>
                    <span className="text-yellow-400 tabular-nums w-8 text-right">{p.acs || "—"}</span>
                    <span className="text-gray-500 tabular-nums w-8 text-right">{p.adr || "—"}</span>
                    <span className="text-blue-400 tabular-nums w-8 text-right">{p.hs_pct ? `${p.hs_pct}%` : "—"}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-xs text-gray-600 border-t border-gray-800 pt-1">
                  <span className="w-16 shrink-0" />
                  <span className="flex-1" />
                  <span className="w-8 text-right">ACS</span>
                  <span className="w-8 text-right">ADR</span>
                  <span className="w-8 text-right">HS%</span>
                </div>
              </div>
            </div>
          )}

          {/* マップ勝率 */}
          {detail.map_stats.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">マップ別勝率</p>
              <div className="space-y-1">
                {detail.map_stats.slice(0, 5).map((m) => (
                  <div key={m.map} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-20 shrink-0 truncate">{m.map}</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.win_rate >= 0.6 ? "bg-green-500" : m.win_rate >= 0.4 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${m.win_rate * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right tabular-nums">{(m.win_rate * 100).toFixed(0)}%</span>
                    <span className="text-xs text-gray-600 w-6 text-right">{m.played}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 直近試合 */}
          {detail.recent_matches.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">直近の試合</p>
              <div className="space-y-1">
                {detail.recent_matches.map((m) => (
                  <div key={m.match_id} className="flex items-center gap-2 text-xs">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${m.won ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-gray-400 flex-1 truncate">{m.opponent}</span>
                    <span className="text-gray-300 tabular-nums">{m.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* vlr.gg チームページリンク */}
          {detail.vlr_url && (
            <a
              href={detail.vlr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              vlr.gg でチーム詳細を見る
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function MatchModal({ match: m, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      onClose();
    }
  }

  const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    live:     { label: "● LIVE", cls: "text-red-400 animate-pulse" },
    upcoming: { label: "UPCOMING", cls: "text-gray-500" },
    tbd:      { label: "TBD", cls: "text-yellow-600" },
  };
  const status = STATUS_LABEL[m.status] ?? STATUS_LABEL.upcoming;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="w-full max-w-3xl rounded-2xl bg-gray-950 border border-gray-700 text-white p-0 backdrop:bg-black/60 open:flex open:flex-col"
      style={{ maxHeight: "90vh" }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
        <div>
          <span className={`text-xs font-bold mr-3 ${status.cls}`}>{status.label}</span>
          {m.match_time && <span className="text-xs text-gray-500">{m.match_time}</span>}
          <p className="text-xs text-gray-600 mt-0.5 truncate max-w-xs">{m.event}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      {/* 予想スコア */}
      <div className="px-6 py-4 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <p className={`flex-1 text-right font-semibold ${m.predicted_winner === m.team1 ? "text-white" : "text-gray-400"}`}>
            {m.team1}
          </p>
          <div className="flex flex-col items-center gap-1 shrink-0 w-36">
            <div className="flex w-full h-2 rounded-full overflow-hidden bg-gray-800">
              <div className="bg-red-500 h-full" style={{ width: `${m.team1_win_prob * 100}%` }} />
            </div>
            <div className="flex gap-3 text-sm font-bold tabular-nums">
              <span className={m.predicted_winner === m.team1 ? "text-red-400" : "text-gray-500"}>
                {(m.team1_win_prob * 100).toFixed(0)}%
              </span>
              <span className="text-gray-700">vs</span>
              <span className={m.predicted_winner === m.team2 ? "text-red-400" : "text-gray-500"}>
                {(m.team2_win_prob * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <p className={`flex-1 font-semibold ${m.predicted_winner === m.team2 ? "text-white" : "text-gray-400"}`}>
            {m.team2}
          </p>
        </div>

        {/* 予想根拠ラベル */}
        <p className="text-center text-xs text-gray-600 mt-2">
          予想根拠: 通算勝率 · 直近モメンタム · 平均ACS · 直接対決履歴
        </p>
      </div>

      {/* 選手情報（2カラム） */}
      <div className="flex gap-6 px-6 py-5 overflow-y-auto flex-1">
        <TeamPanel teamName={m.team1} prob={m.team1_win_prob} />
        <div className="w-px bg-gray-800 shrink-0" />
        <TeamPanel teamName={m.team2} prob={m.team2_win_prob} />
      </div>

      {/* フッター */}
      <div className="px-6 py-3 border-t border-gray-800 shrink-0 text-center">
        <a
          href={m.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          vlr.gg で試合詳細を見る →
        </a>
      </div>
    </dialog>
  );
}
