import { Suspense } from "react";
import Header from "@/components/Header";
import MatchListWithRegion from "@/components/MatchListWithRegion";
import PredictForm from "@/components/PredictForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            試合予想
          </h2>
          <PredictForm />
        </section>
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
