import { Suspense } from "react";
import Header from "@/components/Header";
import MatchListWithRegion from "@/components/MatchListWithRegion";
import PredictForm from "@/components/PredictForm";
import StatsBanner from "@/components/StatsBanner";
import FeaturedMatch from "@/components/FeaturedMatch";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-8 sm:space-y-10">

        {/* サービス統計バナー */}
        <section>
          <Suspense fallback={<div className="h-16 bg-gray-900 rounded-xl animate-pulse" />}>
            <StatsBanner />
          </Suspense>
        </section>

        {/* 注目試合 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            注目の一戦
          </h2>
          <Suspense fallback={<div className="h-24 bg-gray-900 rounded-xl animate-pulse" />}>
            <FeaturedMatch />
          </Suspense>
        </section>

        {/* 試合予想フォーム */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            試合予想
          </h2>
          <Suspense fallback={<div className="h-48 bg-gray-900 rounded-xl animate-pulse" />}>
            <PredictForm />
          </Suspense>
        </section>

        {/* 直近の試合結果 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            直近の試合結果
          </h2>
          <Suspense fallback={<div className="h-60 bg-gray-900 rounded-xl animate-pulse" />}>
            <MatchListWithRegion />
          </Suspense>
        </section>
      </div>
      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-xs text-gray-600">
        AI予想は参考情報です。データ提供: vlr.gg / Riot Games API
      </footer>
    </main>
  );
}
