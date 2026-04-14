---
作成日: 2026-04-15
更新日: 2026-04-15
担当: CTO
目的: 次回セッション開始時に即着手できるよう、現状と次のTODOを整理する
ネクストアクション: 下記「Phase 3 実装計画」を上から順に着手する
---

# esports-predict — 次回セッション引き継ぎ

## 現在の状態（2026-04-15 時点）

| 項目 | 状態 |
|---|---|
| 本番URL | https://valorant-ai-predict.vercel.app |
| GitHub | https://github.com/mukai-work/esports-predict |
| DB | Supabase（249試合・153チーム投入済み） |
| Riot API | Development Key のみ（Production Key 申請済み・審査待ち） |
| Web UI | 予想フォーム + 直近試合一覧（ベーシック版） |

### ローカル起動方法

```bash
cd D:/claude-code/esports-predict/web
npm run dev   # → http://localhost:3000
```

### データ追加収集

```bash
cd D:/claude-code/esports-predict
python scripts/fetch_all.py        # vlr.gg から最新試合を収集
python scripts/migrate_to_supabase.py  # Supabase に反映
```

---

## Phase 3 実装計画（次回着手する内容）

### 1. 試合スケジュールページ 【最優先】

**やること**
- vlr.gg の upcoming matches をスクレイピング（`scripts/vlr_scraper.py` に `fetch_upcoming()` を追加）
- `/schedule` ページを新設
- 各試合にAI予想（勝率%）を並べて表示
- 終了した試合は「予想 vs 実際」を並べて表示（的中 ✅ / 外れ ❌）

**実装ファイル**
- `scripts/vlr_scraper.py` → `fetch_upcoming_matches()` 追加
- `web/src/app/schedule/page.tsx` → 新規作成
- `web/src/app/api/schedule/route.ts` → 新規作成
- `web/src/components/ScheduleCard.tsx` → 新規作成

---

### 2. 予想ファクター強化

**現状**: 通算勝率のシグモイド変換のみ

**追加したい特徴量**
- マップ別勝率（例: Ascent で T1 は 75%）
- 選手個人のスタッツ（ACS・KD・HS%）
- 直近5試合の勝率（モメンタム）
- 対戦相手との過去の直接対決履歴（head-to-head）

**実装ファイル**
- `scripts/vlr_scraper.py` → `fetch_player_stats()` 追加（試合詳細から選手スタッツ抽出）
- `scripts/data_processor.py` → `build_map_stats()`, `build_player_stats()` 追加
- `models/predictor.py` → 特徴量を追加してモデル再学習（GradientBoosting）
- Supabase に `map_stats`, `player_stats` テーブル追加（`src/db/schema.sql` に追記）

---

### 3. マップ予想機能

**やること**
- 過去のマップピック・バンを集計
- チームごとに「必ずピックするマップ」「必ずバンするマップ」を算出
- 試合予想ページにマップ予測セクションを追加

**データソース**
- vlr.gg の試合詳細（`data/matches/*.json` の `maps` フィールドに既にデータあり）
- ピック率・バン率を集計するスクリプトが必要

**実装ファイル**
- `scripts/data_processor.py` → `build_map_pick_stats()` 追加
- `web/src/app/api/map-predict/route.ts` → 新規作成
- `web/src/components/MapPrediction.tsx` → 新規作成

---

### 4. リージョン別フィルタリング

**リージョン分類（vlr.gg のイベント名から判定）**
| リージョン | キーワード例 |
|---|---|
| Americas | VCT Americas, Challengers North America, Brazil |
| EMEA | VCT EMEA, Challengers EMEA, Turkey |
| Pacific | VCT Pacific, Challengers APAC, Japan, Korea |
| China | VCT CN, Challengers China |

**やること**
- Supabase の `matches` テーブルに `region` カラムを追加
- データを再収集して `region` を付与
- トップページにリージョンタブを追加（Americas / EMEA / Pacific / China / All）

**実装ファイル**
- `src/db/schema.sql` → `matches` テーブルに `region TEXT` カラム追加
- `scripts/data_processor.py` → `detect_region(event_name)` 関数追加
- `web/src/components/RegionTabs.tsx` → 新規作成
- `web/src/app/page.tsx` → リージョンタブを組み込み

---

## 実装優先順位

```
1位: 試合スケジュール + AI予想表示（一番ユーザーが見たいもの）
2位: リージョン別フィルタリング（見やすさ改善）
3位: マップ予想（差別化ポイント）
4位: 予想ファクター強化（精度改善）
```

---

## 技術メモ（引き継ぎ）

### vlr.gg upcoming matches の URL

```
https://www.vlr.gg/matches  # 今後の試合一覧
# event_slug でフィルタ可能
```

### Supabase 接続情報

```
URL: https://udorprwbgfhagtvscoxa.supabase.co
ANON KEY: .env ファイルを参照
```

### Vercel 環境変数の更新方法

```bash
cd D:/claude-code/esports-predict/web
vercel env add <KEY_NAME> production
vercel --prod
```

### マップデータが既に存在する

`data/matches/*.json` の各ファイルに以下が含まれている:
```json
"maps": [
  {
    "map": "Pearl",
    "score1": "7",
    "score2": "13",
    "agents_team1": ["Fade","Phoenix","Chamber","Waylay","Astra"],
    "agents_team2": ["Waylay","Astra","Neon","Killjoy","Sova"]
  }
]
```
→ マップ予想・エージェント分析に今すぐ使える

---

## Riot API Production Key（審査待ち）

承認後の対応:
```bash
cd D:/claude-code/esports-predict/web
vercel env add RIOT_API_KEY production  # 新しい Production Key を入力
vercel --prod
```
