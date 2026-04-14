"""
Riot Games API クライアント
- レート制限管理（20 req/s, 100 req/2min）
- VALORANT Content / Match / Account API
"""

import os
import time
import json
from pathlib import Path
from collections import deque
import requests
from dotenv import load_dotenv

load_dotenv()

RIOT_API_KEY = os.getenv("RIOT_API_KEY")
RIOT_REGION = os.getenv("RIOT_REGION", "ap")

BASE_URL = f"https://{RIOT_REGION}.api.riotgames.com"
DATA_DIR = Path(__file__).parent.parent / "data"


class RateLimiter:
    """
    Riot API のレート制限に合わせたトークンバケット実装。
    - 20 req / 1s
    - 100 req / 120s
    """

    def __init__(self):
        self.short_window = deque()   # 1秒ウィンドウ
        self.long_window = deque()    # 2分ウィンドウ
        self.short_limit = 20
        self.long_limit = 100
        self.short_period = 1.0
        self.long_period = 120.0

    def wait(self):
        now = time.time()

        # 古いタイムスタンプを削除
        while self.short_window and now - self.short_window[0] > self.short_period:
            self.short_window.popleft()
        while self.long_window and now - self.long_window[0] > self.long_period:
            self.long_window.popleft()

        # 制限に達している場合は待機
        if len(self.short_window) >= self.short_limit:
            sleep_time = self.short_period - (now - self.short_window[0]) + 0.05
            if sleep_time > 0:
                time.sleep(sleep_time)
            now = time.time()
            while self.short_window and now - self.short_window[0] > self.short_period:
                self.short_window.popleft()

        if len(self.long_window) >= self.long_limit:
            sleep_time = self.long_period - (now - self.long_window[0]) + 0.05
            if sleep_time > 0:
                print(f"[RateLimit] 2分制限に到達。{sleep_time:.1f}秒待機...")
                time.sleep(sleep_time)
            now = time.time()
            while self.long_window and now - self.long_window[0] > self.long_period:
                self.long_window.popleft()

        self.short_window.append(now)
        self.long_window.append(now)


_rate_limiter = RateLimiter()


def _get(endpoint: str, params: dict = None) -> dict:
    """API リクエストの共通処理（レート制限・エラーハンドリング含む）"""
    if not RIOT_API_KEY:
        raise ValueError(".env に RIOT_API_KEY が設定されていません")

    _rate_limiter.wait()

    url = f"{BASE_URL}{endpoint}"
    headers = {"X-Riot-Token": RIOT_API_KEY}

    response = requests.get(url, headers=headers, params=params, timeout=10)

    if response.status_code == 429:
        retry_after = int(response.headers.get("Retry-After", 5))
        print(f"[RateLimit] 429 Too Many Requests。{retry_after}秒後にリトライ...")
        time.sleep(retry_after + 1)
        return _get(endpoint, params)

    response.raise_for_status()
    return response.json()


# ─── VALORANT Content API ───────────────────────────────────────────────────

def fetch_content() -> dict:
    """
    全エージェント・マップ・武器情報を取得してローカルに保存する。

    locale パラメータを渡すと Riot API が localizedNames マップを省略し
    name フィールドのみを上書きする仕様のため、パラメータなしで取得する。
    localizedNames["ja-JP"] から日本語名を参照できる。
    """
    data = _get("/val/content/v1/contents")
    out_path = DATA_DIR / "raw" / "val_content.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[Content] 保存完了: {out_path}")
    return data


def get_agents(content: dict = None) -> list[dict]:
    """エージェント一覧を返す。content が None の場合はキャッシュを読む。"""
    if content is None:
        cache = DATA_DIR / "raw" / "val_content.json"
        if cache.exists():
            with open(cache, encoding="utf-8") as f:
                content = json.load(f)
        else:
            content = fetch_content()
    return content.get("characters", [])


def get_maps(content: dict = None) -> list[dict]:
    """マップ一覧を返す。"""
    if content is None:
        cache = DATA_DIR / "raw" / "val_content.json"
        if cache.exists():
            with open(cache, encoding="utf-8") as f:
                content = json.load(f)
        else:
            content = fetch_content()
    return content.get("maps", [])


# ─── VALORANT Match API（将来の拡張用） ─────────────────────────────────────

def fetch_match(match_id: str) -> dict:
    """
    個別マッチの詳細を取得する。
    注意: この API はランクマッチ（一般プレイヤー）用。
         VCT プロ試合データは vlr_scraper.py で取得する。
    """
    return _get(f"/val/match/v1/matches/{match_id}")


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print("=== Riot API 動作確認 ===")
    print(f"Region: {RIOT_REGION}")
    content = fetch_content()
    agents = get_agents(content)
    maps = get_maps(content)
    print(f"エージェント数: {len(agents)}")
    print(f"マップ数: {len(maps)}")
    print("エージェント一覧:")
    for a in agents[:5]:
        ja_name = a.get("localizedNames", {}).get("ja-JP", a["name"])
        print(f"  {a['name']} ({ja_name})")
    print("  ...")
