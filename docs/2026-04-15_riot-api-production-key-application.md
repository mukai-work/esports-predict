---
作成日: 2026-04-15
更新日: 2026-04-15
担当: CTO
目的: Riot Games API Production Key 申請用のプロジェクト説明文（英語）
ネクストアクション: https://developer.riotgames.com/ にログインして新しいアプリケーションを登録・申請する
---

# Riot API Production Key — 申請書

> **申請先**: https://developer.riotgames.com/
> **申請手順**: Developer Portal → Applications → Create New Application → 下記を記入

---

## Application Name（アプリ名）
```
Valorant Match Predictor
```

## Description（説明文）
```
Valorant Match Predictor is a Japanese-language web service that provides
AI-powered win probability predictions for professional Valorant (VCT) matches.

The service fetches player rank data and agent/map information via the
official Riot Games API to display publicly available statistics.
No account login, rank boosting, or competitive advantage features are provided.
All data displayed is publicly available information.

Target audience: Japanese-speaking Valorant esports fans who want to enjoy
match prediction in their native language. Currently no similar Japanese-language
service exists.

Live URL: https://valorant-ai-predict.vercel.app
```

## Application Type（アプリ種別）
```
Personal Project → 申請後 Commercial に切替
```

## API Usage（利用するAPI）
```
- VALORANT Content API (val/content/v1/contents): Agent names, map names (display only)
- VALORANT Match API (val/match/v1/matches): Not used for pro matches
  (Pro match data is sourced from public scraping of vlr.gg)
```

## Monetization（収益化）
```
Free tier: Display advertising (Google AdSense)
Paid tier (future): Monthly subscription for premium prediction details
No pay-to-win, no MMR boosting, no account trading features.
```

---

## 申請時の注意点

1. **動くプロトタイプが必要**: https://valorant-ai-predict.vercel.app が公開済みなのでそのまま提出可
2. **審査期間**: 週次レビュー、最大3週間
3. **承認後**: Production Key（期限なし）に切り替え → `.env` / Vercel 環境変数を更新
4. **却下された場合の代替**: vlr.gg + Liquipedia データのみで継続可能（Riot APIはエージェント名表示のみなので影響小）

---

## Vercel 環境変数の更新手順（承認後）

```bash
vercel env add RIOT_API_KEY production
# プロンプトに Production Key を貼り付け
vercel --prod  # 再デプロイ
```
