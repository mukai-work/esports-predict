"""
Supabase マイグレーションスクリプト
ローカルの JSON/CSV データを Supabase にアップロードする。

使い方:
    python scripts/migrate_to_supabase.py
"""

import json
import os
import sys
from pathlib import Path

import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # service_role キー（書き込み権限）

DATA_DIR = Path(__file__).parent.parent / "data"
PROCESSED_DIR = DATA_DIR / "processed"
MATCHES_DIR = DATA_DIR / "matches"


def get_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError(".env に SUPABASE_URL と SUPABASE_SERVICE_KEY を設定してください")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def migrate_team_stats(supabase: Client):
    """team_stats.csv を team_stats テーブルに upsert する"""
    csv_path = PROCESSED_DIR / "team_stats.csv"
    if not csv_path.exists():
        print("[skip] team_stats.csv が見つかりません")
        return

    df = pd.read_csv(csv_path)
    records = df.to_dict(orient="records")

    # upsert（team が既存なら更新）
    result = supabase.table("team_stats").upsert(records, on_conflict="team").execute()
    print(f"[migrate] team_stats: {len(records)} 件 upsert 完了")


def migrate_matches(supabase: Client):
    """data/matches/*.json を matches テーブルに upsert する"""
    if not MATCHES_DIR.exists():
        print("[skip] data/matches/ が見つかりません")
        return

    files = list(MATCHES_DIR.glob("*.json"))
    records = []

    for f in files:
        with open(f, encoding="utf-8") as fp:
            m = json.load(fp)

        records.append({
            "match_id": m.get("match_id", ""),
            "team1": m.get("team1", ""),
            "team2": m.get("team2", ""),
            "score1": m.get("score1", ""),
            "score2": m.get("score2", ""),
            "winner": m.get("winner", ""),
            "event": m.get("event", ""),
            "map_count": len(m.get("maps", [])),
            "maps": m.get("maps", []),
            "scraped_at": m.get("scraped_at"),
        })

    # 100件ずつバッチ upsert
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        supabase.table("matches").upsert(batch, on_conflict="match_id").execute()
        print(f"[migrate] matches: {i + len(batch)}/{len(records)} 件完了")

    print(f"[migrate] matches: 合計 {len(records)} 件 upsert 完了")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    print("=== Supabase マイグレーション ===")
    supabase = get_client()
    migrate_team_stats(supabase)
    migrate_matches(supabase)
    print("\n[完了] マイグレーション完了")
