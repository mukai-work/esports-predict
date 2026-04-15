import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Valorant AI Predictor",
    short_name: "VAI Predict",
    description: "Valorant VCT プロ試合 AI 勝敗予想サービス",
    start_url: "/",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#ef4444",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
    categories: ["sports", "entertainment"],
    lang: "ja",
  };
}
