import { Suspense } from "react";
import Link from "next/link";
import MatchListWithRegion from "@/components/MatchListWithRegion";
import PredictForm from "@/components/PredictForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center font-bold text-sm">V</div>
          <div>
            <h1 className="text-lg font-bold leading-none">Valorant AI Predictor</h1>
            <p className="text-xs text-gray-400">VCT プロ試合 AI 勝敗予想</p>
          </div>
          <nav className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/" className="text-white font-semibold border-b border-red-500">ホーム</Link>
            <Link href="/schedule" className="text-gray-400 hover:text-white transition-colors">スケジュール</Link>
            <Link href="/results" className="text-gray-400 hover:text-white transition-colors">結果</Link>
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-full">
              BETA
            </span>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Predict Section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            試合予想
          </h2>
          <PredictForm />
        </section>

        {/* Recent Matches with Region Filter */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            直近の試合結果
          </h2>
          <Suspense fallback={<div className="h-60 bg-gray-900 rounded-xl animate-pulse" />}>
            <MatchListWithRegion />
          </Suspense>
        </section>
      </div>

      <footer className="border-t border-gray-800 mt-16 py-6 text-center text-xs text-gray-600">
        AI予想は参考情報です。データ提供: vlr.gg / Riot Games API
      </footer>
    </main>
  );
}
