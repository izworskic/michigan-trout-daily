"""Fail unless a real Michigan Trout Daily report is published and readable today."""

import re
import json
import sys
import time
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

WP_SITE_ID = "254267068"
WP_API = f"https://public-api.wordpress.com/rest/v1.1/sites/{WP_SITE_ID}"
DISPLAY_ORIGIN = "https://daily.michigantroutreport.com"
MIN_REAL_WORDS = 250
MICHIGAN_TZ = ZoneInfo("America/Detroit")


def word_count(html):
    plain = re.sub(r"<[^>]+>", " ", html or "")
    return len(re.sub(r"\s+", " ", plain).strip().split())


def find_today_post():
    today = datetime.now(MICHIGAN_TZ).strftime("%Y-%m-%d")
    request = Request(
        f"{WP_API}/posts/?number=8&fields=ID,date,title,slug,status,content,URL",
        headers={"User-Agent": "MichiganTroutDailyVerifier/1.0"},
    )
    with urlopen(request, timeout=30) as response:
        payload = json.load(response)
    for post in payload.get("posts", []):
        if post.get("status") != "publish" or not post.get("date", "").startswith(today):
            continue
        words = word_count(post.get("content"))
        if words >= MIN_REAL_WORDS:
            return post, words
    return None, 0


def main():
    post, words = find_today_post()
    if not post:
        print("No real Michigan Trout Daily report exists for today.", file=sys.stderr)
        return 1

    live_url = f"{DISPLAY_ORIGIN}/post/{post['slug']}"
    for attempt in range(1, 7):
        try:
            request = Request(live_url, headers={"User-Agent": "MichiganTroutDailyVerifier/1.0"})
            with urlopen(request, timeout=30) as response:
                status = response.status
                body = response.read().decode("utf-8", errors="replace")
            if status == 200 and post.get("title", "")[:35] in body:
                print(f"Verified {words}-word report: {live_url}")
                return 0
            print(f"Display verification {attempt}/6: HTTP {status}")
        except (HTTPError, URLError, TimeoutError) as error:
            print(f"Display verification {attempt}/6: {error}")
        if attempt < 6:
            time.sleep(10)

    print(f"WordPress has today's report, but the display page is not readable: {live_url}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
