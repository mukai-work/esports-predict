"""
Valorant プロ試合 勝敗予想モデル
Phase 1: 勝率ベースのシンプルな予測（XGBoost）

特徴量:
- 両チームの通算勝率
- 直近5試合の勝利数
- 勝率差（team1 - team2）

出力:
- team1 の勝利確率（0.0〜1.0）
"""

import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL_DIR = Path(__file__).parent
PROCESSED_DIR = DATA_DIR / "processed"
MATCHES_DIR = DATA_DIR / "matches"

FEATURES = ["team1_win_rate", "team2_win_rate", "team1_recent_wins", "team2_recent_wins", "win_rate_diff"]
TARGET = "target"


def load_features() -> pd.DataFrame:
    path = PROCESSED_DIR / "match_features.csv"
    if not path.exists():
        raise FileNotFoundError("先に data_processor.py を実行してください")
    return pd.read_csv(path)


def train(df: pd.DataFrame) -> tuple:
    """
    モデルを学習して保存する。
    データが少ない間は LogisticRegression、
    50試合以上あれば GradientBoosting に自動切替。
    """
    X = df[FEATURES].values
    y = df[TARGET].values

    if len(df) < 10:
        raise ValueError(f"学習データが少なすぎます（{len(df)}件）。最低10試合必要です。")

    if len(df) >= 50:
        model = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", GradientBoostingClassifier(n_estimators=100, max_depth=3, random_state=42)),
        ])
        model_name = "GradientBoosting"
    else:
        model = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(random_state=42)),
        ])
        model_name = "LogisticRegression"

    # クロスバリデーション
    cv_folds = min(5, len(df) // 2)
    if cv_folds >= 2:
        scores = cross_val_score(model, X, y, cv=cv_folds, scoring="accuracy")
        print(f"[model] {model_name} | CV Accuracy: {scores.mean():.3f} ± {scores.std():.3f}")
    else:
        print(f"[model] {model_name} | データ数が少ないためCV省略")

    model.fit(X, y)

    # 保存
    model_path = MODEL_DIR / "predictor.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    print(f"[model] 保存: {model_path}")

    return model, model_name


def load_model():
    model_path = MODEL_DIR / "predictor.pkl"
    if not model_path.exists():
        raise FileNotFoundError("モデルが見つかりません。先に train() を実行してください。")
    with open(model_path, "rb") as f:
        return pickle.load(f)


def predict(team1: str, team2: str, team_stats: pd.DataFrame) -> dict:
    """
    2チームの対戦予想を返す。

    Parameters
    ----------
    team1, team2 : str
        チーム名（team_stats に存在するもの）
    team_stats : pd.DataFrame
        build_team_stats() の出力

    Returns
    -------
    dict
        {
            "team1": str, "team2": str,
            "team1_win_prob": float,  # 0.0〜1.0
            "team2_win_prob": float,
            "predicted_winner": str,
        }
    """
    model = load_model()

    def get_stats(team):
        row = team_stats[team_stats["team"] == team]
        if row.empty:
            return {"win_rate": 0.5, "recent_wins": 0}
        return {
            "win_rate": float(row["win_rate"].iloc[0]),
            "recent_wins": int(row["wins"].iloc[0]),
        }

    s1 = get_stats(team1)
    s2 = get_stats(team2)

    features = np.array([[
        s1["win_rate"],
        s2["win_rate"],
        s1["recent_wins"],
        s2["recent_wins"],
        s1["win_rate"] - s2["win_rate"],
    ]])

    prob = model.predict_proba(features)[0]
    # prob[1] = team1 勝利確率（target=1）
    team1_prob = float(prob[1])
    team2_prob = float(prob[0])

    return {
        "team1": team1,
        "team2": team2,
        "team1_win_prob": round(team1_prob, 3),
        "team2_win_prob": round(team2_prob, 3),
        "predicted_winner": team1 if team1_prob >= 0.5 else team2,
    }


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")

    print("=== 予想モデル 学習・テスト ===")
    df = load_features()
    print(f"学習データ: {len(df)} 試合")

    if len(df) < 10:
        print(f"データが {len(df)} 件しかありません。")
        print("fetch_all.py でデータを収集してからもう一度実行してください。")
    else:
        model, model_name = train(df)

        # サンプル予測
        stats_path = PROCESSED_DIR / "team_stats.csv"
        team_stats = pd.read_csv(stats_path)
        teams = team_stats["team"].tolist()

        if len(teams) >= 2:
            result = predict(teams[0], teams[1], team_stats)
            print(f"\n予想例: {result['team1']} vs {result['team2']}")
            print(f"  {result['team1']}: {result['team1_win_prob']:.1%}")
            print(f"  {result['team2']}: {result['team2_win_prob']:.1%}")
            print(f"  予想勝者: {result['predicted_winner']}")
