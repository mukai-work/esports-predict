import Link from "next/link";
import Header from "@/components/Header";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="text-8xl font-black text-gray-800">404</div>
        <div>
          <h2 className="text-xl font-bold text-white">ページが見つかりません</h2>
          <p className="text-gray-500 mt-2 text-sm">
            お探しのページは存在しないか、移動した可能性があります。
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
          >
            ホームへ戻る
          </Link>
          <Link
            href="/schedule"
            className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border border-gray-700"
          >
            スケジュールを見る
          </Link>
          <Link
            href="/rankings"
            className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors border border-gray-700"
          >
            ランキングを見る
          </Link>
        </div>
      </div>
    </main>
  );
}
