"""
Valorant プロ試合 勝敗予想モデル（強化版）
Phase 4: 複合特徴量による GradientBoosting 予想

特徴量:
- 通算勝率（team1/team2）
- 直近5試合のモメンタム
- 勝率差
- head-to-head 勝率（対戦履歴あり時）
- チーム平均 ACS・ADR（選手スタッツあり時）

出力:
- team1 の勝利確率（0.0〜1.0）
- 特徴量の重要度
"""

import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL_DIR = Path(__file__).parent
PROCESSED_DIR = DATA_DIR / "processed"

FEATURES = [
    "team1_win_rate",
    "team2_win_rate",
    "win_rate_diff",
    "team1_recent_wins",
    "team2_recent_wins",
    "recent_diff",
    "h2h_rate",        # 0.5 = no data
    "team1_avg_acs",   # 0 = no data
    "team2_avg_acs",
    "acs_diff",
]
TARGET = "target"


def _safe_float(val, default=0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def load_features() -> pd.DataFrame:
    path = PROCESSED_DIR / "match_features_v2.csv"
    if not path.exists():
        raise FileNotFoundError("match_features_v2.csv がありません。build_enhanced_features() を実行してください")
    return pd.read_csv(path)


def build_enhanced_features(matches: list[dict]) -> pd.DataFrame:
    """
    強化版特徴量テーブルを作成する。
    - 通算勝率 + モメンタム + h2h + チーム平均 ACS
    """
    from scripts.data_processor import build_h2h_stats, build_team_avg_stats

    # チーム平均 ACS lookup（全試合平均 - 大きなリークにならない）
    acs_df = build_team_avg_stats(matches)
    acs_lookup: dict[str, float] = {}
    if not acs_df.empty:
        acs_lookup = dict(zip(acs_df["team"], acs_df["avg_acs"]))

    # 時系列順に試合を並べて特徴量を構築
    # h2h も増分計算してリークを防ぐ
    matches_sorted = sorted(matches, key=lambda m: m.get("date", ""))
    team_history: dict[str, list[int]] = {}
    h2h_history: dict[tuple, list[int]] = {}  # (sorted_pair) -> [t1_won, ...]
    rows = []

    for m in matches_sorted:
        t1, t2 = m.get("team1", ""), m.get("team2", "")
        if not t1 or not t2:
            continue
        try:
            s1, s2 = int(m["score1"]), int(m["score2"])
        except (ValueError, TypeError):
            continue

        h1 = team_history.get(t1, [])
        h2 = team_history.get(t2, [])

        t1_wr = sum(h1) / len(h1) if h1 else 0.5
        t2_wr = sum(h2) / len(h2) if h2 else 0.5
        t1_recent = sum(h1[-5:]) if h1 else 0
        t2_recent = sum(h2[-5:]) if h2 else 0

        # h2h: 過去の対戦履歴のみ（増分）
        key_ab = tuple(sorted([t1, t2]))
        h2h_hist = h2h_history.get(key_ab, [])
        if h2h_hist:
            # key_ab[0] が t1 か t2 かで方向を合わせる
            t1_h2h_wins = sum(h2h_hist) if key_ab[0] == t1 else len(h2h_hist) - sum(h2h_hist)
            h2h_rate_t1 = t1_h2h_wins / len(h2h_hist)
        else:
            h2h_rate_t1 = 0.5

        # ACS
        t1_acs = acs_lookup.get(t1, 0.0)
        t2_acs = acs_lookup.get(t2, 0.0)

        rows.append({
            "match_id": m["match_id"],
            "team1": t1,
            "team2": t2,
            "team1_win_rate": round(t1_wr, 3),
            "team2_win_rate": round(t2_wr, 3),
            "win_rate_diff": round(t1_wr - t2_wr, 3),
            "team1_recent_wins": t1_recent,
            "team2_recent_wins": t2_recent,
            "recent_diff": t1_recent - t2_recent,
            "h2h_rate": round(h2h_rate_t1, 3),
            "team1_avg_acs": round(t1_acs, 1),
            "team2_avg_acs": round(t2_acs, 1),
            "acs_diff": round(t1_acs - t2_acs, 1),
            "target": 1 if s1 > s2 else 0,
        })

        # 履歴を更新（この試合の結果を次の試合から使えるようにする）
        team_history.setdefault(t1, []).append(1 if s1 > s2 else 0)
        team_history.setdefault(t2, []).append(1 if s2 > s1 else 0)
        # h2h 履歴更新: key_ab[0] が t1 の時 1=t1 win
        h2h_history.setdefault(key_ab, []).append(1 if (key_ab[0] == t1 and s1 > s2) or (key_ab[0] == t2 and s2 > s1) else 0)

    df = pd.DataFrame(rows)

    # 保存
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(PROCESSED_DIR / "match_features_v2.csv", index=False, encoding="utf-8")
    print(f"[predictor] match_features_v2.csv 保存: {len(df)} 件")
    return df


def train(df: pd.DataFrame) -> tuple:
    X = df[FEATURES].fillna(0).values
    y = df[TARGET].values

    if len(df) < 10:
        raise ValueError(f"データ不足 ({len(df)}件)")

    if len(df) >= 50:
        model = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", GradientBoostingClassifier(
                n_estimators=200,
                max_depth=3,
                learning_rate=0.05,
                subsample=0.8,
                random_state=42,
            )),
        ])
        model_name = "GradientBoosting"
    else:
        model = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(random_state=42)),
        ])
        model_name = "LogisticRegression"

    cv_folds = min(5, len(df) // 5)
    if cv_folds >= 2:
        scores = cross_val_score(model, X, y, cv=cv_folds, scoring="accuracy")
        print(f"[predictor] {model_name} | CV Accuracy: {scores.mean():.3f} ± {scores.std():.3f}")

    model.fit(X, y)

    # 特徴量重要度
    clf = model.named_steps["clf"]
    if hasattr(clf, "feature_importances_"):
        importances = dict(zip(FEATURES, clf.feature_importances_))
        top = sorted(importances.items(), key=lambda x: -x[1])
        print("[predictor] 特徴量重要度 Top5:")
        for feat, imp in top[:5]:
            print(f"  {feat:<22}: {imp:.3f}")

    model_path = MODEL_DIR / "predictor.pkl"
    with open(model_path, "wb") as f:
        pickle.dump({"model": model, "features": FEATURES}, f)
    print(f"[predictor] 保存: {model_path}")
    return model, model_name


def load_model():
    model_path = MODEL_DIR / "predictor.pkl"
    if not model_path.exists():
        return None, FEATURES
    with open(model_path, "rb") as f:
        d = pickle.load(f)
    if isinstance(d, dict):
        return d["model"], d.get("features", FEATURES)
    return d, FEATURES  # 旧形式


def predict(
    team1: str,
    team2: str,
    team_stats: pd.DataFrame,
    h2h_df: pd.DataFrame | None = None,
    acs_lookup: dict | None = None,
) -> dict:
    """
    2チームの対戦予想を返す。

    Returns
    -------
    dict
        team1, team2, team1_win_prob, team2_win_prob, predicted_winner,
        factors（各ファクターの値）
    """
    model, features = load_model()

    def get_stats(team: str) -> dict:
        row = team_stats[team_stats["team"] == team]
        if row.empty:
            row = team_stats[team_stats["team"].str.contains(team, case=False, na=False)]
        if row.empty:
            return {"win_rate": 0.5, "recent_wins": 0}
        r = row.iloc[0]
        return {"win_rate": float(r["win_rate"]), "recent_wins": int(r.get("wins", 0))}

    s1 = get_stats(team1)
    s2 = get_stats(team2)

    # h2h
    h2h_rate = 0.5
    if h2h_df is not None and not h2h_df.empty:
        row = h2h_df[
            ((h2h_df["team1"] == team1) & (h2h_df["team2"] == team2))
        ]
        if not row.empty:
            h2h_rate = float(row.iloc[0]["team1_h2h_rate"])
        else:
            row_rev = h2h_df[
                ((h2h_df["team1"] == team2) & (h2h_df["team2"] == team1))
            ]
            if not row_rev.empty:
                h2h_rate = 1.0 - float(row_rev.iloc[0]["team1_h2h_rate"])

    # ACS
    t1_acs = acs_lookup.get(team1, 0.0) if acs_lookup else 0.0
    t2_acs = acs_lookup.get(team2, 0.0) if acs_lookup else 0.0

    factor_vals = {
        "team1_win_rate": s1["win_rate"],
        "team2_win_rate": s2["win_rate"],
        "win_rate_diff": s1["win_rate"] - s2["win_rate"],
        "team1_recent_wins": s1["recent_wins"],
        "team2_recent_wins": s2["recent_wins"],
        "recent_diff": s1["recent_wins"] - s2["recent_wins"],
        "h2h_rate": h2h_rate,
        "team1_avg_acs": t1_acs,
        "team2_avg_acs": t2_acs,
        "acs_diff": t1_acs - t2_acs,
    }

    if model is not None:
        X = np.array([[factor_vals[f] for f in features]])
        prob = model.predict_proba(X)[0]
        team1_prob = float(prob[1])
    else:
        # モデルなし: シグモイド fallback
        diff = s1["win_rate"] - s2["win_rate"]
        team1_prob = float(1 / (1 + np.exp(-diff * 5)))

    return {
        "team1": team1,
        "team2": team2,
        "team1_win_prob": round(team1_prob, 3),
        "team2_win_prob": round(1 - team1_prob, 3),
        "predicted_winner": team1 if team1_prob >= 0.5 else team2,
        "factors": {
            "team1_win_rate": round(s1["win_rate"], 3),
            "team2_win_rate": round(s2["win_rate"], 3),
            "h2h_rate": round(h2h_rate, 3),
            "h2h_available": h2h_rate != 0.5,
            "team1_avg_acs": round(t1_acs, 1),
            "team2_avg_acs": round(t2_acs, 1),
            "acs_available": t1_acs > 0 or t2_acs > 0,
        },
    }


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")

    print("=== 予想モデル 学習・テスト ===")

    from scripts.data_processor import load_all_matches
    matches = load_all_matches()
    print(f"試合数: {len(matches)}")
    print(f"選手スタッツ付き: {sum(1 for m in matches if m.get('players'))}")

    df = build_enhanced_features(matches)
    print(f"特徴量テーブル: {len(df)} 行")

    if len(df) >= 10:
        model, name = train(df)

        from scripts.data_processor import build_team_stats, build_h2h_stats, build_team_avg_stats
        stats = build_team_stats(matches)
        h2h = build_h2h_stats(matches)
        acs_df = build_team_avg_stats(matches)
        acs_lookup = dict(zip(acs_df["team"], acs_df["avg_acs"])) if not acs_df.empty else {}

        teams = stats["team"].tolist()
        if len(teams) >= 2:
            r = predict(teams[0], teams[1], stats, h2h, acs_lookup)
            print(f"\n予想: {r['team1']} vs {r['team2']}")
            print(f"  {r['team1']}: {r['team1_win_prob']:.1%}")
            print(f"  {r['team2']}: {r['team2_win_prob']:.1%}")
            print(f"  勝者予想: {r['predicted_winner']}")
            print(f"  ファクター: {r['factors']}")
