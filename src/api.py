"""
eスポーツ AI 予想 API（FastAPI）
フロントエンドから呼ばれるエンドポイント群。

起動:
    uvicorn src.api:app --reload --port 8000
"""

import json
import sys
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# プロジェクトルートをパスに追加
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.predictor import predict, load_model
from scripts.data_processor import load_all_matches, build_team_stats

DATA_DIR = Path(__file__).parent.parent / "data"
PROCESSED_DIR = DATA_DIR / "processed"

app = FastAPI(title="Valorant AI Predictor API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ─── キャッシュ ──────────────────────────────────────────────────────────────

_team_stats: pd.DataFrame | None = None

def get_team_stats() -> pd.DataFrame:
    global _team_stats
    if _team_stats is None:
        path = PROCESSED_DIR / "team_stats.csv"
        if not path.exists():
            raise HTTPException(status_code=503, detail="データ未収集。fetch_all.py を実行してください")
        _team_stats = pd.read_csv(path)
    return _team_stats


# ─── エンドポイント ──────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "service": "Valorant AI Predictor"}


@app.get("/teams")
def list_teams():
    """チーム一覧と勝率を返す"""
    stats = get_team_stats()
    return {
        "teams": stats.to_dict(orient="records")
    }


@app.get("/predict/{team1}/{team2}")
def predict_match(team1: str, team2: str):
    """
    2チームの対戦予想を返す。

    Returns
    -------
    {
        "team1": str,
        "team2": str,
        "team1_win_prob": float,
        "team2_win_prob": float,
        "predicted_winner": str,
        "team1_stats": {...},
        "team2_stats": {...},
    }
    """
    stats = get_team_stats()

    # チームが存在するか確認（部分一致も許容）
    def find_team(name: str) -> str:
        exact = stats[stats["team"] == name]
        if not exact.empty:
            return name
        partial = stats[stats["team"].str.contains(name, case=False, na=False)]
        if not partial.empty:
            return partial.iloc[0]["team"]
        return name  # 存在しなくても予測は可能（0.5 として扱う）

    t1 = find_team(team1)
    t2 = find_team(team2)

    try:
        result = predict(t1, t2, stats)
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="モデル未学習。predictor.py を実行してください")

    def get_team_detail(team: str) -> dict:
        row = stats[stats["team"] == team]
        if row.empty:
            return {"matches": 0, "wins": 0, "losses": 0, "win_rate": 0.5}
        r = row.iloc[0]
        return {
            "matches": int(r["matches"]),
            "wins": int(r["wins"]),
            "losses": int(r["losses"]),
            "win_rate": float(r["win_rate"]),
        }

    return {
        **result,
        "team1_stats": get_team_detail(t1),
        "team2_stats": get_team_detail(t2),
    }


@app.get("/matches/recent")
def recent_matches(limit: int = 20):
    """直近の試合結果一覧を返す"""
    matches_dir = DATA_DIR / "matches"
    if not matches_dir.exists():
        return {"matches": []}

    files = sorted(matches_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    results = []
    for f in files[:limit]:
        with open(f, encoding="utf-8") as fp:
            m = json.load(fp)
        results.append({
            "match_id": m.get("match_id"),
            "team1": m.get("team1"),
            "team2": m.get("team2"),
            "score1": m.get("score1"),
            "score2": m.get("score2"),
            "winner": m.get("winner"),
            "event": m.get("event"),
            "maps": len(m.get("maps", [])),
        })

    return {"matches": results}


@app.get("/agents")
def list_agents():
    """エージェント一覧（日本語名付き）"""
    content_path = DATA_DIR / "raw" / "val_content.json"
    if not content_path.exists():
        return {"agents": []}
    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)
    agents = [
        {
            "id": a["id"],
            "name": a["name"],
            "name_ja": a.get("localizedNames", {}).get("ja-JP", a["name"]),
        }
        for a in content.get("characters", [])
    ]
    return {"agents": agents}
