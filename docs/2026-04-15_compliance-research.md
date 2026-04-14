---
作成日: 2026-04-15
更新日: 2026-04-15
担当: CTO / CFO
目的: eスポーツAI予想サービス（Valorant）の事業化にあたり、法的・データ利用・技術面のリスクを事前に整理する
ネクストアクション: リスク評価を踏まえてPhase1の設計に着手（詳細は下部参照）
---

# eスポーツ AI予想サービス — コンプライアンス調査レポート

> **調査日**: 2026-04-15  
> **対象サービス**: Valorantプロ試合AI勝敗予想（日本語Webサービス）

---

## 1. 日本の法律リスク ✅ LOW

### 1-1. 賭博罪（刑法185条）との関係

| 項目 | 評価 | 根拠 |
|------|------|------|
| 金銭の得喪を伴わない勝率表示 | **問題なし** | 賭博罪の構成要件「財物の得喪を争う行為」を満たさない |
| ユーザーが金を賭ける機能 | **完全NG** | 即座に賭博罪・賭博場開帳等図利罪 |
| 月額課金・広告収益 | **問題なし** | サービス対価であり、試合結果との利益連動なし |

**結論**: AI予想の「表示・提供」自体は完全合法。ベッティング（金銭賭博）機能を追加した瞬間に違法。

### 1-2. 国内先行事例（合法サービス）

- **SPAIA（スパイア）**: プロ野球・Jリーグ対象のAI勝敗予想サービス。広告収益・有料プランで運営中。上場企業が運営しており、法的整理が確立している。
- **toto予想系サービス**: スポーツ振興投票法に基づく特別法の管轄だが、「AI予想を表示するだけ」のサービスはtotoと無関係。

### 1-3. 景品表示法

予想的中ユーザーへの「報酬・ポイント付与」は景品類に該当する可能性がある。  
→ **フェーズ1では付与機能は実装しない**（リスク回避）。

---

## 2. Riot Games API 利用リスク ⚠️ MEDIUM

### 2-1. APIキーの種類と商用利用条件

| キー種別 | 用途 | 商用利用 |
|----------|------|----------|
| Development Key | 開発・テスト用 | ❌ 不可（レート制限あり） |
| Personal Key | 個人サイト・小規模 | △ 限定的 |
| Production Key | 商用サービス | ✅ **審査通過後に許可** |

**広告収益・月額課金**: Production Key取得 + Approved/Acknowledged ステータス後は**明示的に許可**されている。

### 2-2. 申請プロセス

1. Developer Portal でプロジェクト登録
2. 動くプロトタイプを作成（**審査前に完成品が必要**）
3. Riot DevRel チームによる週次レビュー（最大3週間）
4. 承認後 Production Key 発行

**リスク**: Riot の裁量で却下・取り消し可能。事業の根幹をRiot APIに依存するのは中リスク。

### 2-3. Riot APIで取得できるデータ

```
- プレイヤーのランク・stats（ランクAPI）
- マッチ履歴（Match API）
- キャラクター・マップ情報（Asset API）
```

**⚠️ 取得できないもの**: VCTプロ試合の詳細データ（マップごとの結果、エージェント構成など）  
→ プロ試合データは別途データソースが必要。

---

## 3. VCTプロ試合データ取得リスク ⚠️ MEDIUM

### 3-1. 公式ルート：GRID × Riot「Valorant Data Portal」

- 2023年にRiot×GRIDが共同設立したオフィシャルデータポータル
- **対象**: VCTパートナー30チームのみ（チームが試合データにアクセスするもの）
- **一般企業向け公開**: 現時点では非公開。法人向け問い合わせは可能

**アクション候補**: GRIDへの問い合わせ（将来フェーズ）

### 3-2. vlr.gg スクレイピング

| 項目 | 評価 |
|------|------|
| ToS上の明文規定 | 自動化ツール禁止の記載あり |
| 実態・コミュニティ | モデレーターが「ルール的に問題ない」と発言（公式掲示板） |
| 商用利用での法的リスク | **グレーゾーン** |
| 技術的実現性 | ✅ 複数のOSSスクレイパーが存在・実績あり |

**推奨対応**:
- レート制限（1リクエスト/秒以上の間隔）を守る
- スクレイピング用 User-Agent を明示する
- 将来的に vlr.gg 運営へ正式問い合わせ or データ提携を打診する

### 3-3. 代替データソース

| ソース | 内容 | 利用可否 |
|--------|------|----------|
| Liquipedia | VCT試合結果・チーム情報 | ✅ Wikipedia系ライセンス・スクレイピング可 |
| Kaggle公開データセット | 過去VCT試合データ | ✅ 研究用・モデル訓練に活用可 |
| VCT Hackathon（AWS Devpost） | LLM向け選手データセット | ✅ ハッカソン参加で公式データ取得実績あり |

---

## 4. 技術スタック案 ✅ LOW RISK

### 推奨構成（Claude Codeで全実装可能）

```
フロントエンド:  Next.js (App Router) + Tailwind CSS
バックエンド:    Python (FastAPI) または Next.js API Routes
データ取得:     Riot API SDK (Python/JS) + vlr.gg スクレイパー
AI予想モデル:   scikit-learn / XGBoost（Phase1） → 将来: LLM統合
DB:             PostgreSQL (Supabase) or SQLite（Phase1）
デプロイ:       Vercel（フロント）+ Railway or Render（バック）
認証・課金:     Supabase Auth + Stripe
```

**コスト試算（月額）**:
| 項目 | 費用 |
|------|------|
| Vercel（無料枠） | ¥0 |
| Supabase（無料枠） | ¥0 |
| Railway（Hobby） | 〜¥700 |
| ドメイン | 〜¥1,500/年 |
| **合計 Phase1** | **〜¥700/月** |

---

## 5. 競合・市場リスク ✅ LOW

- **日本語Valorant予想サービス**: 現時点でほぼ存在しない（空白地帯）
- **英語圏**: vlr.gg・Liquipedia・Thespike.gg などが存在するが日本語なし
- **参入障壁**: Riot API審査・プロデータ取得・AI設計のナレッジが参入障壁になる

---

## 6. リスクサマリー

| カテゴリ | リスクレベル | 対応方針 |
|----------|------------|----------|
| 日本法（賭博・景品法） | ✅ **LOW** | 金銭賭博・報酬付与機能は実装しない |
| Riot API商用利用 | ⚠️ **MEDIUM** | MVP完成後に正式申請。却下時の代替策も設計 |
| vlr.gg スクレイピング | ⚠️ **MEDIUM** | レート制限厳守・将来的に正式提携打診 |
| 技術実現性 | ✅ **LOW** | 既存OSSとClaude Codeで全実装可能 |
| 収益化（広告・課金） | ✅ **LOW** | Riot API承認後に実装 |
| 市場競合 | ✅ **LOW** | 日本語サービスは空白地帯 |

---

## 7. フェーズ設計（推奨）

### Phase 1（1〜2週間）: データ収集基盤 + 予想ロジック
- [ ] vlr.gg スクレイパー実装（Liquipediaも併用）
- [ ] Riot API Development Key でプレイヤーstats取得
- [ ] 過去試合データの収集・整形
- [ ] シンプルな予想モデル実装（勝率%表示）

### Phase 2（2〜4週間）: Webサービス公開
- [ ] Next.js フロントエンド実装
- [ ] 試合一覧・予想表示ページ
- [ ] Riot API Production Key 申請（Phase1のプロトタイプを提出）
- [ ] 広告タグ設置（Google AdSense等）

### Phase 3（1〜2ヶ月）: 有料化
- [ ] ユーザー認証実装（Supabase Auth）
- [ ] Stripe 月額課金実装
- [ ] プレミアム機能（詳細分析・通知）実装

---

## 8. 今すぐできるアクション（5分以内）

1. **[すぐ]** Riot Developer Portal にアカウント登録 → Development Key 取得
2. **[すぐ]** vlr.gg の robots.txt を確認する（`https://www.vlr.gg/robots.txt`）
3. **[Phase1着手時]** Liquipedia の過去VCTデータをスクレイピングして試合DBを作る

---

## 参考リンク

- [Riot API General Policies](https://developer.riotgames.com/policies/general)
- [Riot API Terms](https://developer.riotgames.com/terms)
- [VALORANT Data Portal (GRID)](https://esportsinsider.com/2023/02/grid-riot-games-valorant-data-portal)
- [VCT Hackathon (AWS)](https://vcthackathon.devpost.com/)
- [vlr.gg Terms of Service](https://www.vlr.gg/terms)
- [SPAIA - 日本の合法AI予想サービス先行事例](https://spaia.jp/)
- [eスポーツと法規制 解説](https://note.com/ymgamelaw/n/n5c9128b4c2bb)
