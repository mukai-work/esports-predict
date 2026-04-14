"""
Phase 1 マスタースクリプト
これ1つ実行するだけでデータ収集 → 整形 → 確認まで完結する。

使い方:
    python scripts/fetch_all.py
"""

import sys
from pathlib import Path

# プロジェクトルートを sys.path に追加
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.riot_client import fetch_content, get_agents, get_maps
from scripts.vlr_scraper import collect_matches
from scripts.data_processor import (
    load_all_matches,
    build_team_stats,
    build_match_features,
    save_processed,
)


def main():
    print("=" * 60)
    print("  esports-predict Phase1 データ収集パイプライン")
    print("=" * 60)

    # Step 1: Riot API からエージェント・マップ情報を取得
    print("\n[Step 1] Riot API: エージェント・マップ情報 取得")
    content = fetch_content(locale="ja-JP")
    agents = get_agents(content)
    maps = get_maps(content)
    print(f"  エージェント: {len(agents)} 体")
    print(f"  マップ: {len(maps)} 個")

    # Step 2: vlr.gg からプロ試合データを収集
    print("\n[Step 2] vlr.gg: VCT 2025 試合データ 収集（3ページ分）")
    print("  ※ レート制限のため数十秒かかります")
    matches = collect_matches(event_slug="vct-2025", max_pages=3)

    if not matches:
        print("  試合データが取得できませんでした。event_slug を確認してください。")
        return

    # Step 3: データ整形・特徴量生成
    print("\n[Step 3] データ整形・特徴量エンジニアリング")
    all_matches = load_all_matches()
    stats = build_team_stats(all_matches)
    features = build_match_features(all_matches)

    save_processed(stats, "team_stats")
    save_processed(features, "match_features")

    # Step 4: サマリー表示
    print("\n" + "=" * 60)
    print("  収集完了サマリー")
    print("=" * 60)
    print(f"  試合数:            {len(all_matches)}")
    print(f"  ユニークチーム数:  {len(stats)}")
    print(f"  特徴量行数:        {len(features)}")

    if not stats.empty:
        print("\n  チーム勝率ランキング（上位5）:")
        for _, row in stats.head(5).iterrows():
            bar = "█" * int(row["win_rate"] * 20)
            print(f"    {row['team'][:20]:<22} {row['win_rate']:.1%}  {bar}")

    print("\n  保存先:")
    print("    data/raw/val_content.json     → Riot API コンテンツ")
    print("    data/matches/*.json           → 試合詳細")
    print("    data/processed/team_stats.csv → チーム勝率")
    print("    data/processed/match_features.csv → 学習用特徴量")
    print("\n[完了] Phase 2（Web UI）に進む準備ができました。")


if __name__ == "__main__":
    main()
