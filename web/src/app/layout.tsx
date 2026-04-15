import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://valorant-ai-predict.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Valorant AI Predictor | VCT 勝敗予想",
    template: "%s | Valorant AI Predictor",
  },
  description:
    "Valorant VCT プロ試合の AI 勝敗予想サービス。チーム勝率・選手スタッツ・マップ別勝率をもとに試合結果を予測します。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: BASE_URL,
    siteName: "Valorant AI Predictor",
    title: "Valorant AI Predictor | VCT 勝敗予想",
    description: "VCT プロ試合の AI 勝敗予想。チーム勝率・選手スタッツをもとにリアルタイム予測。",
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Valorant AI Predictor | VCT 勝敗予想",
    description: "VCT プロ試合の AI 勝敗予想サービス",
  },
  metadataBase: new URL(BASE_URL),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
