"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",         label: "ホーム" },
  { href: "/schedule", label: "スケジュール" },
  { href: "/results",  label: "結果" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-800 bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center font-bold text-sm shrink-0">
          V
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">Valorant AI Predictor</h1>
          <p className="text-xs text-gray-400">VCT プロ試合 AI 勝敗予想</p>
        </div>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          {NAV.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={
                  active
                    ? "text-white font-semibold border-b border-red-500"
                    : "text-gray-400 hover:text-white transition-colors"
                }
              >
                {label}
              </Link>
            );
          })}
          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full">
            BETA
          </span>
        </nav>
      </div>
    </header>
  );
}
