---
作成日: 2026-04-15
更新日: 2026-04-15
担当: CTO
目的: eスポーツAI予想サービスのプロジェクト概要と進行管理
ネクストアクション: Phase1（データ収集基盤）着手
---

# esports-predict — Valorant AI勝敗予想サービス

日本初のValorantプロ試合AI勝敗予想Webサービス。

## ディレクトリ構成

```
esports-predict/
├── docs/          # 調査・仕様ドキュメント
├── src/           # アプリケーションコード（Web・API）
├── scripts/       # データ収集スクリプト（スクレイパー等）
├── data/          # 収集した試合データ（CSV・JSON）
├── models/        # 予想AIモデル
└── README.md
```

## フェーズ進捗

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 0 | コンプライアンス調査 | ✅ 完了 |
| Phase 1 | データ収集基盤 + 予想ロジック | 🔲 未着手 |
| Phase 2 | Webサービス公開 + Riot API申請 | 🔲 未着手 |
| Phase 3 | 有料化（Stripe課金） | 🔲 未着手 |

## 主要ドキュメント

- [コンプライアンス調査](docs/2026-04-15_compliance-research.md)

## 技術スタック

- フロントエンド: Next.js + Tailwind CSS
- バックエンド: FastAPI (Python) または Next.js API Routes
- データ取得: Riot API + vlr.gg スクレイパー
- AIモデル: scikit-learn / XGBoost
- DB: Supabase (PostgreSQL)
- デプロイ: Vercel + Railway
- 課金: Stripe
