import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/api/cron/"],
      },
    ],
    sitemap: "https://valorant-ai-predict.vercel.app/sitemap.xml",
  };
}
