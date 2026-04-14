"""
vlr.gg スクレイパー
VCT プロ試合結果・チーム stats を収集する。

利用ポリシー:
- 1リクエスト/秒 以上の間隔を空ける（ToS グレーゾーン対策）
- User-Agent を明示する
- ローカルキャッシュを利用して同一ページの重複取得を避ける
"""

import time
import json
import re
from pathlib import Path
from datetime import datetime

import requests
from bs4 import BeautifulSoup

DATA_DIR = Path(__file__).parent.parent / "data"
CACHE_DIR = DATA_DIR / "raw" / "vlr_cache"
MATCHES_DIR = DATA_DIR / "matches"

HEADERS = {
    "User-Agent": "esports-predict-research/1.0 (educational; contact via github)",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
}

REQUEST_INTERVAL = 1.2  # 秒（1秒より少し余裕を持たせる）

_last_request_time = 0.0


def _get(url: str, use_cache: bool = True) -> BeautifulSoup:
    """レート制限付き GET + キャッシュ"""
    global _last_request_time

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_key = re.sub(r"[^\w]", "_", url) + ".html"
    cache_path = CACHE_DIR / cache_key

    if use_cache and cache_path.exists():
        with open(cache_path, encoding="utf-8") as f:
            return BeautifulSoup(f.read(), "lxml")

    # レート制限
    elapsed = time.time() - _last_request_time
    if elapsed < REQUEST_INTERVAL:
        time.sleep(REQUEST_INTERVAL - elapsed)

    response = requests.get(url, headers=HEADERS, timeout=15)
    response.raise_for_status()
    _last_request_time = time.time()

    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(response.text)

    return BeautifulSoup(response.text, "lxml")


# ─── 試合一覧取得 ──────────────────────────────────────────────────────────

def fetch_match_list(event_slug: str = "vct-2025", page: int = 1) -> list[dict]:
    """
    指定イベントの試合一覧を取得する。

    Parameters
    ----------
    event_slug : str
        vlr.gg のイベント識別子（例: "vct-2025"）
    page : int
        ページ番号

    Returns
    -------
    list[dict]
        試合の基本情報リスト
    """
    url = f"https://www.vlr.gg/matches/results/?event_slug={event_slug}&page={page}"
    print(f"[vlr] 試合一覧取得: {url}")
    soup = _get(url)

    matches = []
    for item in soup.select("a.match-item"):
        match_id_match = re.search(r"/(\d+)/", item.get("href", ""))
        if not match_id_match:
            continue

        teams = [t.get_text(strip=True) for t in item.select(".match-item-vs-team-name")]
        scores = [s.get_text(strip=True) for s in item.select(".match-item-vs-team-score")]
        event_name = item.select_one(".match-item-event")
        date_el = item.select_one(".match-item-time")

        matches.append({
            "match_id": match_id_match.group(1),
            "url": "https://www.vlr.gg" + item.get("href", ""),
            "team1": teams[0] if len(teams) > 0 else "",
            "team2": teams[1] if len(teams) > 1 else "",
            "score1": scores[0] if len(scores) > 0 else "",
            "score2": scores[1] if len(scores) > 1 else "",
            "event": event_name.get_text(strip=True) if event_name else "",
            "date": date_el.get_text(strip=True) if date_el else "",
            "scraped_at": datetime.now().isoformat(),
        })

    print(f"[vlr] {len(matches)} 試合取得")
    return matches


# ─── 試合詳細取得 ──────────────────────────────────────────────────────────

def fetch_match_detail(match_id: str) -> dict:
    """
    個別試合の詳細（マップ別スコア・エージェント構成・stats）を取得する。

    Parameters
    ----------
    match_id : str
        vlr.gg の試合ID（例: "309000"）

    Returns
    -------
    dict
        試合詳細情報
    """
    url = f"https://www.vlr.gg/{match_id}"
    print(f"[vlr] 試合詳細取得: match_id={match_id}")
    soup = _get(url)

    # チーム名
    teams = [t.get_text(strip=True) for t in soup.select(".wf-title-med")]

    # 全体スコア（.js-spoiler の最初の2要素: "0:2" と "vs."）
    spoilers = soup.select(".js-spoiler")
    score_raw = spoilers[0].get_text(strip=True) if spoilers else ""
    # "0:2" 形式を分割
    score_parts = score_raw.split(":") if ":" in score_raw else ["", ""]
    score1 = score_parts[0].strip()
    score2 = score_parts[1].strip() if len(score_parts) > 1 else ""

    # マップ結果
    maps = []
    for map_el in soup.select(".vm-stats-game"):
        header = map_el.select_one(".vm-stats-game-header")
        if not header:
            continue

        # マップ名: .map > div > span（最初のテキストノード）
        map_name = ""
        map_div = header.select_one(".map")
        if map_div:
            span = map_div.select_one("span")
            if span:
                # 最初の直接テキストノードを取得
                map_name = span.get_text(separator=" ", strip=True).split()[0]

        # チームスコア: .team .score（左が team1、.mod-right が team2）
        team_divs = header.select(".team")
        score_t1 = team_divs[0].select_one(".score").get_text(strip=True) if len(team_divs) > 0 else ""
        score_t2 = team_divs[1].select_one(".score").get_text(strip=True) if len(team_divs) > 1 else ""

        # エージェント構成: 各テーブルの td.mod-agents img
        tables = map_el.select("table")
        agents_t1, agents_t2 = [], []
        if len(tables) >= 1:
            for row in tables[0].select("tr")[1:]:  # ヘッダー行をスキップ
                imgs = row.select("td.mod-agents img")
                for img in imgs:
                    agents_t1.append(img.get("title", img.get("alt", "")))
        if len(tables) >= 2:
            for row in tables[1].select("tr")[1:]:
                imgs = row.select("td.mod-agents img")
                for img in imgs:
                    agents_t2.append(img.get("title", img.get("alt", "")))

        maps.append({
            "map": map_name,
            "score1": score_t1,
            "score2": score_t2,
            "agents_team1": agents_t1,
            "agents_team2": agents_t2,
        })

    # イベント名・日付
    event_el = soup.select_one(".match-header-super a")
    date_el = soup.select_one(".moment-tz-convert")

    detail = {
        "match_id": match_id,
        "url": url,
        "team1": teams[0] if len(teams) > 0 else "",
        "team2": teams[1] if len(teams) > 1 else "",
        "score1": score1,
        "score2": score2,
        "winner": teams[0] if score1 > score2 else teams[1] if score2 > score1 else "draw",
        "event": event_el.get_text(strip=True) if event_el else "",
        "date": date_el.get("data-utc-ts", "") if date_el else "",
        "maps": maps,
        "scraped_at": datetime.now().isoformat(),
    }

    return detail


# ─── 複数試合の一括収集 ────────────────────────────────────────────────────

def collect_matches(event_slug: str = "vct-2025", max_pages: int = 3) -> list[dict]:
    """
    複数ページにわたる試合一覧を収集して詳細も取得する。

    Parameters
    ----------
    event_slug : str
        収集対象イベント
    max_pages : int
        取得する最大ページ数

    Returns
    -------
    list[dict]
        詳細付き試合データのリスト
    """
    MATCHES_DIR.mkdir(parents=True, exist_ok=True)

    all_matches = []
    for page in range(1, max_pages + 1):
        match_list = fetch_match_list(event_slug, page)
        if not match_list:
            print(f"[vlr] page {page} で試合なし。終了。")
            break

        for m in match_list:
            match_id = m["match_id"]
            out_path = MATCHES_DIR / f"{match_id}.json"

            if out_path.exists():
                with open(out_path, encoding="utf-8") as f:
                    detail = json.load(f)
                print(f"[vlr] キャッシュ使用: {match_id}")
            else:
                detail = fetch_match_detail(match_id)
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(detail, f, ensure_ascii=False, indent=2)

            all_matches.append(detail)

    print(f"\n[vlr] 合計 {len(all_matches)} 試合収集完了")
    return all_matches


# ─── 試合スケジュール取得 ──────────────────────────────────────────────────

def fetch_upcoming_matches() -> list[dict]:
    """
    vlr.gg の /matches から今後の試合（未終了）を取得する。
    LIVE 中の試合も含む。

    Returns
    -------
    list[dict]
        {match_id, team1, team2, match_time, event, status, url}
    """
    url = "https://www.vlr.gg/matches"
    print(f"[vlr] スケジュール取得: {url}")
    soup = _get(url, use_cache=False)  # スケジュールはリアルタイムなのでキャッシュなし

    matches = []
    for item in soup.select("a.match-item"):
        match_id_match = re.search(r"/(\d+)/", item.get("href", ""))
        if not match_id_match:
            continue

        teams = [t.get_text(strip=True) for t in item.select(".match-item-vs-team-name")]
        event_el = item.select_one(".match-item-event")
        time_el = item.select_one(".match-item-time")
        eta_el = item.select_one(".match-item-eta")

        status = "upcoming"
        if eta_el:
            eta_text = eta_el.get_text(strip=True).upper()
            if "LIVE" in eta_text:
                status = "live"
            elif "TBD" in eta_text:
                status = "tbd"

        matches.append({
            "match_id": match_id_match.group(1),
            "url": "https://www.vlr.gg" + item.get("href", ""),
            "team1": teams[0] if len(teams) > 0 else "TBD",
            "team2": teams[1] if len(teams) > 1 else "TBD",
            "match_time": time_el.get_text(strip=True) if time_el else "",
            "event": event_el.get_text(strip=True) if event_el else "",
            "status": status,
            "scraped_at": datetime.now().isoformat(),
        })

    print(f"[vlr] {len(matches)} 試合取得")
    return matches


if __name__ == "__main__":
    # 動作確認: VCT 2025 の試合を1ページ分取得
    print("=== vlr.gg スクレイパー 動作確認 ===")
    matches = fetch_match_list("vct-2025", page=1)
    if matches:
        print(f"\n最新試合: {matches[0]['team1']} vs {matches[0]['team2']}")
        print(f"  スコア: {matches[0]['score1']} - {matches[0]['score2']}")
        print(f"  イベント: {matches[0]['event']}")

        # 最初の1試合だけ詳細取得
        print("\n--- 詳細取得（1試合のみ）---")
        detail = fetch_match_detail(matches[0]["match_id"])
        print(f"マップ数: {len(detail['maps'])}")
        for m in detail["maps"]:
            print(f"  {m['map']}: {m['score1']} - {m['score2']}")
