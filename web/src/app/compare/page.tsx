import { Suspense } from "react";
import CompareClient from "./CompareClient";

export const metadata = {
  title: "チーム比較",
  description: "Valorant VCT 2チームの詳細対戦予想。勝率・直近フォーム・H2H・マップ別勝率を比較。",
};

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareClient />
    </Suspense>
  );
}
