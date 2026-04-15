"""
データ整形・特徴量エンジニアリング
収集した試合データを予想モデルの入力形式に変換する。
"""

import json
from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).parent.parent / "data"
MATCHES_DIR = DATA_DIR / "matches"
PROCESSED_DIR = DATA_DIR / "processed"


def load_all_matches() -> list[dict]:
    """MATCHES_DIR 内の全 JSON を読み込む"""
    matches = []
    for path in sorted(MATCHES_DIR.glob("*.json")):
        with open(path, encoding="utf-8") as f:
            matches.append(json.load(f))
    print(f"[processor] {len(matches)} 試合ロード")
    return matches


def build_team_stats(matches: list[dict]) -> pd.DataFrame:
    """
    チームごとの勝率・マップ勝率・エージェント使用率を計算する。

    Returns
    -------
    pd.DataFrame
        チーム名 をインデックスとする stats テーブル
    """
    records = []

    for m in matches:
        if not m.get("team1") or not m.get("team2"):
            continue

        try:
            s1 = int(m["score1"])
            s2 = int(m["score2"])
        except (ValueError, TypeError):
            continue

        winner = m["team1"] if s1 > s2 else m["team2"]
        loser = m["team2"] if s1 > s2 else m["team1"]

        records.append({"team": winner, "win": 1, "loss": 0, "match_id": m["match_id"]})
        records.append({"team": loser, "win": 0, "loss": 1, "match_id": m["match_id"]})

    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records)
    stats = df.groupby("team").agg(
        matches=("match_id", "count"),
        wins=("win", "sum"),
        losses=("loss", "sum"),
    ).reset_index()

    stats["win_rate"] = (stats["wins"] / stats["matches"]).round(3)
    stats = stats.sort_values("win_rate", ascending=False).reset_index(drop=True)
    return stats


def build_match_features(matches: list[dict]) -> pd.DataFrame:
    """
    試合ごとの特徴量テーブルを作る（モデルの学習用）。

    特徴量:
    - team1_win_rate_before: 試合前時点のチーム1の勝率
    - team2_win_rate_before: 試合前時点のチーム2の勝率
    - team1_recent_wins: 直近5試合の勝利数
    - team2_recent_wins: 直近5試合の勝利数
    - target: 1=team1勝利, 0=team2勝利
    """
    # 試合を日付順にソート（日付が空の場合は末尾）
    matches_sorted = sorted(matches, key=lambda m: m.get("date", ""))

    team_history: dict[str, list[int]] = {}  # team -> [1, 0, 1, ...] (1=勝)
    rows = []

    for m in matches_sorted:
        t1 = m.get("team1", "")
        t2 = m.get("team2", "")
        if not t1 or not t2:
            continue

        try:
            s1 = int(m["score1"])
            s2 = int(m["score2"])
        except (ValueError, TypeError):
            continue

        t1_hist = team_history.get(t1, [])
        t2_hist = team_history.get(t2, [])

        t1_wr = sum(t1_hist) / len(t1_hist) if t1_hist else 0.5
        t2_wr = sum(t2_hist) / len(t2_hist) if t2_hist else 0.5
        t1_recent = sum(t1_hist[-5:]) if t1_hist else 0
        t2_recent = sum(t2_hist[-5:]) if t2_hist else 0

        target = 1 if s1 > s2 else 0

        rows.append({
            "match_id": m["match_id"],
            "team1": t1,
            "team2": t2,
            "team1_win_rate": t1_wr,
            "team2_win_rate": t2_wr,
            "team1_recent_wins": t1_recent,
            "team2_recent_wins": t2_recent,
            "win_rate_diff": t1_wr - t2_wr,
            "target": target,
        })

        # 履歴を更新
        team_history.setdefault(t1, []).append(1 if s1 > s2 else 0)
        team_history.setdefault(t2, []).append(1 if s2 > s1 else 0)

    df = pd.DataFrame(rows)
    return df


def build_h2h_stats(matches: list[dict]) -> pd.DataFrame:
    """
    チームペアごとの直接対決（head-to-head）勝率を計算する。

    Returns
    -------
    pd.DataFrame
        team1, team2, team1_h2h_wins, team2_h2h_wins, team1_h2h_rate の集計
    """
    from collections import defaultdict
    records: dict[tuple, list] = defaultdict(list)

    for m in matches:
        t1, t2 = m.get("team1", ""), m.get("team2", "")
        if not t1 or not t2:
            continue
        try:
            s1, s2 = int(m["score1"]), int(m["score2"])
        except (ValueError, TypeError):
            continue
        key = tuple(sorted([t1, t2]))
        records[key].append(1 if (key[0] == t1 and s1 > s2) or (key[0] == t2 and s2 > s1) else 0)

    rows = []
    for (ta, tb), results in records.items():
        ta_wins = sum(results)
        tb_wins = len(results) - ta_wins
        rows.append({
            "team1": ta,
            "team2": tb,
            "matches": len(results),
            "team1_wins": ta_wins,
            "team2_wins": tb_wins,
            "team1_h2h_rate": round(ta_wins / len(results), 3),
        })

    return pd.DataFrame(rows) if rows else pd.DataFrame()


def build_team_avg_stats(matches: list[dict]) -> pd.DataFrame:
    """
    試合の選手スタッツからチームごとの平均 ACS・ADR・KD を集計する。
    players フィールドがある試合のみ対象。

    Returns
    -------
    pd.DataFrame
        team, avg_acs, avg_adr, avg_hs_pct の平均スタッツテーブル
    """
    from collections import defaultdict
    team_stats: dict[str, list] = defaultdict(list)

    for m in matches:
        players = m.get("players", [])
        if not players:
            continue
        t1, t2 = m.get("team1", ""), m.get("team2", "")
        for p in players:
            team = t1 if p.get("team_idx", 0) == 0 else t2
            try:
                acs = float(p.get("acs", 0) or 0)
                adr = float(p.get("adr", 0) or 0)
                hs = float(p.get("hs_pct", 0) or 0)
                if acs > 0:
                    team_stats[team].append({"acs": acs, "adr": adr, "hs": hs})
            except (ValueError, TypeError):
                continue

    rows = []
    for team, stats in team_stats.items():
        rows.append({
            "team": team,
            "avg_acs": round(sum(s["acs"] for s in stats) / len(stats), 1),
            "avg_adr": round(sum(s["adr"] for s in stats) / len(stats), 1),
            "avg_hs_pct": round(sum(s["hs"] for s in stats) / len(stats), 1),
            "player_count": len(stats),
        })

    df = pd.DataFrame(rows) if rows else pd.DataFrame()
    if not df.empty:
        df = df.sort_values("avg_acs", ascending=False).reset_index(drop=True)
    return df


def detect_region(event_name: str) -> str:
    """
    イベント名からリージョンを判定する。

    Returns: "Americas" | "EMEA" | "Pacific" | "China" | "Other"
    """
    e = event_name.upper()
    if any(k in e for k in ["AMERICAS", "NORTH AMERICA", "NA ", "BRAZIL", "LATIN", "MIBR", "LOUD", "FURIA"]):
        return "Americas"
    if any(k in e for k in ["EMEA", "EUROPE", "TURKEY", "SPAIN", "GERMANY", "FRANCE", "BENELUX", "NORDIC", "DACH", "UK ", "BBL", "NAVI", "FNATIC"]):
        return "EMEA"
    if any(k in e for k in ["PACIFIC", "APAC", "JAPAN", "KOREA", "SEA", "OCEANIA", "SOUTH ASIA", "VCT 2025: P", "VCT 2026: P"]):
        return "Pacific"
    if any(k in e for k in ["CHINA", "CN", "BILIBILI", "EDG", "TYLOO", "JDG", "DRAGONRANGER", "NOVA ESPORTS"]):
        return "China"
    return "Other"


def build_map_pick_stats(matches: list[dict]) -> pd.DataFrame:
    """
    チームごとのマップ別出現率（ピック傾向）を集計する。
    vlr.gg の試合詳細には「このマップをプレイした」という情報があり、
    BO3/BO5 で実際にプレイされたマップがわかる。

    Returns
    -------
    pd.DataFrame
        team, map, played, wins, losses, win_rate の集計テーブル
    """
    rows = []
    for m in matches:
        maps = m.get("maps", [])
        if not maps:
            continue

        for mp in maps:
            map_name = mp.get("map", "").strip()
            if not map_name or map_name in ("", "TBD"):
                continue

            try:
                s1 = int(mp.get("score1", 0))
                s2 = int(mp.get("score2", 0))
            except (ValueError, TypeError):
                continue

            # team1 目線
            rows.append({
                "team": m.get("team1", ""),
                "map": map_name,
                "win": 1 if s1 > s2 else 0,
            })
            # team2 目線
            rows.append({
                "team": m.get("team2", ""),
                "map": map_name,
                "win": 1 if s2 > s1 else 0,
            })

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    stats = df.groupby(["team", "map"]).agg(
        played=("win", "count"),
        wins=("win", "sum"),
    ).reset_index()
    stats["losses"] = stats["played"] - stats["wins"]
    stats["win_rate"] = (stats["wins"] / stats["played"]).round(3)
    stats = stats.sort_values(["team", "played"], ascending=[True, False]).reset_index(drop=True)
    return stats


def save_processed(df: pd.DataFrame, name: str):
    """処理済みデータを CSV として保存する"""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    path = PROCESSED_DIR / f"{name}.csv"
    df.to_csv(path, index=False, encoding="utf-8")
    print(f"[processor] 保存: {path} ({len(df)} 件)")


if __name__ == "__main__":
    print("=== データ処理 動作確認 ===")
    matches = load_all_matches()

    if not matches:
        print("試合データがありません。先に vlr_scraper.py を実行してください。")
    else:
        stats = build_team_stats(matches)
        print("\n--- チーム勝率ランキング（上位10） ---")
        print(stats.head(10).to_string(index=False))

        features = build_match_features(matches)
        print(f"\n--- 特徴量テーブル（{len(features)} 行） ---")
        print(features.head(5).to_string(index=False))

        save_processed(stats, "team_stats")
        save_processed(features, "match_features")
