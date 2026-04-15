"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",            label: "ホーム",        short: "予想" },
  { href: "/schedule",    label: "スケジュール",  short: "予定" },
  { href: "/results",     label: "結果",          short: "結果" },
  { href: "/rankings",    label: "ランキング",    short: "順位" },
  { href: "/players",     label: "選手",          short: "選手" },
  { href: "/tournaments", label: "大会",          short: "大会" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
        {/* ロゴ */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500 flex items-center justify-center font-bold text-xs sm:text-sm">
            V
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base sm:text-lg font-bold leading-none">Valorant AI Predictor</h1>
            <p className="text-xs text-gray-400">VCT プロ試合 AI 勝敗予想</p>
          </div>
          <span className="sm:hidden text-sm font-bold text-white">VAI</span>
        </Link>

        {/* ナビ: モバイルは重要4項目のみ・PCは全部表示 */}
        <nav className="ml-auto flex items-center gap-0.5 sm:gap-3 text-sm overflow-x-auto scrollbar-none">
          {NAV.map(({ href, label, short }, idx) => {
            const active = pathname === href;
            // モバイルでは最初の4項目のみ表示
            const hideMobile = idx >= 4;
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "px-1.5 sm:px-0 py-1 shrink-0 transition-colors",
                  hideMobile ? "hidden sm:inline-block" : "",
                  active
                    ? "text-white font-semibold border-b border-red-500 pb-0.5 text-xs sm:text-sm"
                    : "text-gray-400 hover:text-white text-xs sm:text-sm"
                ].join(" ")}
              >
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          <span className="hidden sm:inline text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full shrink-0 ml-1">
            BETA
          </span>
        </nav>
      </div>
    </header>
  );
}
