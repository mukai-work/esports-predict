---
作成日: 2026-04-15
更新日: 2026-04-15
担当: CTO
目的: Supabase プロジェクトセットアップ手順（本番DB移行）
ネクストアクション: supabase.com でプロジェクトを作成し、下記手順を実行する
---

# Supabase セットアップ手順

現在 Vercel にデプロイされた Web UI はファイルシステムを読まないため、
データが表示されない。Supabase を繋ぐことでデータが本番環境に表示される。

---

## Step 1: Supabase プロジェクト作成（ブラウザ操作）

1. https://supabase.com にアクセス → サインアップ/ログイン
2. 「New Project」→ 名前: `esports-predict`、リージョン: `Northeast Asia (Tokyo)`
3. Database Password をメモ（後で使わない場合も安全に保管）

---

## Step 2: スキーマ適用（ブラウザ操作）

1. Supabase ダッシュボード → SQL Editor
2. `src/db/schema.sql` の内容をそのまま貼り付けて実行

---

## Step 3: 接続情報を取得（ブラウザ操作）

Settings → API から以下をコピー:
- `Project URL` → `SUPABASE_URL`
- `anon public` key → `SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_KEY`（マイグレーション用のみ）

---

## Step 4: .env に追記（Claude Code が実行）

```
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

---

## Step 5: マイグレーション実行（Claude Code が実行）

```bash
cd D:/claude-code/esports-predict
python scripts/migrate_to_supabase.py
```

→ 249試合・153チームのデータが Supabase に入る

---

## Step 6: Vercel 環境変数を設定（Claude Code が実行）

```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel --prod  # 再デプロイ
```

---

## Step 7: 動作確認

```
https://valorant-ai-predict.vercel.app/api/teams
```
→ チームデータが返れば完了

---

## 費用

Supabase Free Tier で全て賄える:
- DB: 500MB（現データ約2MB → 余裕あり）
- API: 50万リクエスト/月
- Edge Functions: 50万回/月
