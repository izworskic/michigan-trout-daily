"""
Michigan Trout Daily — autonomous publisher.

Runs once daily via GitHub Actions cron. Each run:
  1. Pulls last 14 posts from WP.com to learn which rivers were covered recently
  2. Picks a river from a curated rotation that hasn't appeared in 14 days
  3. Fetches live USGS gauge data (flow + height) for that river
  4. Fetches the NWS short-term forecast for the river's county
  5. Calls Claude (Sonnet 4.5) with the established voice prompt
  6. POSTs the resulting article to WP.com site 254267068
  7. Pings IndexNow with the new URL
  8. On Sundays, generates a weekly Michigan rollup instead of a single river

If anything fails, opens a GitHub issue tagged 'cron-failure' so it's visible.
"""

import json, os, sys, time, random, re, traceback
from datetime import datetime, timezone, timedelta
import requests

# ─── Config ─────────────────────────────────────────────────────────────────
WP_SITE_ID = "254267068"
WP_API = f"https://public-api.wordpress.com/rest/v1.1/sites/{WP_SITE_ID}"
SITE_URL = "https://daily.michigantroutreport.com"
AUTHOR_NAME = "Chris Izworski"
AUTHOR_URL = "https://chrisizworski.com"
CLAUDE_MODEL = "claude-sonnet-4-5"  # solid prose, cost-efficient
ANTHROPIC_API = "https://api.anthropic.com/v1/messages"
RECENCY_DAYS = 14

# Curated rotation. Each entry: slug, display name, USGS gauge, NWS forecast point, region.
# NWS points are (lat,lon) pairs that the api.weather.gov /points endpoint resolves.
RIVERS = [
    # Northern Lower Peninsula
    {"slug": "ausable", "name": "AuSable River", "gauge": "04136500",
     "nws": (44.6394, -84.7197), "region": "Northern Lower Peninsula",
     "context": "the AuSable mainstem near Grayling, the Holy Waters between Burton's Landing and Wakeley Bridge"},
    {"slug": "manistee", "name": "Manistee River", "gauge": "04125550",
     "nws": (44.4225, -85.4189), "region": "Northern Lower Peninsula",
     "context": "the Upper Manistee above Tippy Dam, classic Northern Michigan trout water"},
    {"slug": "boardman", "name": "Boardman River", "gauge": "04126740",
     "nws": (44.7186, -85.5103), "region": "Northern Lower Peninsula",
     "context": "the Boardman near Traverse City, a smaller wild brown trout river"},
    {"slug": "jordan", "name": "Jordan River", "gauge": "04127800",
     "nws": (45.0664, -84.9367), "region": "Northern Lower Peninsula",
     "context": "the Jordan in Antrim County, a designated Michigan Wild and Scenic River"},
    {"slug": "pigeon", "name": "Pigeon River", "gauge": "04127918",
     "nws": (45.1364, -84.6097), "region": "Northern Lower Peninsula",
     "context": "the Pigeon in the Pigeon River Country State Forest, brook trout water"},
    {"slug": "sturgeon-nlp", "name": "Sturgeon River", "gauge": "04127997",
     "nws": (45.3667, -84.7367), "region": "Northern Lower Peninsula",
     "context": "the Sturgeon in Cheboygan County, Michigan's fastest-falling river"},
    {"slug": "rifle", "name": "Rifle River", "gauge": "04142000",
     "nws": (44.3128, -84.0383), "region": "Northern Lower Peninsula",
     "context": "the Rifle through Ogemaw County and the Rifle River State Recreation Area"},
    # Western Lower Peninsula
    {"slug": "pere-marquette", "name": "Pere Marquette River", "gauge": "04122500",
     "nws": (43.9572, -86.0911), "region": "Western Lower Peninsula",
     "context": "the PM through the Manistee National Forest, flies-only water below M-37"},
    {"slug": "muskegon", "name": "Muskegon River", "gauge": "04121970",
     "nws": (43.4222, -85.6750), "region": "Western Lower Peninsula",
     "context": "the Muskegon tailwater below Croton Dam, a steelhead and brown trout fishery"},
    {"slug": "white", "name": "White River", "gauge": "04122100",
     "nws": (43.6233, -86.3361), "region": "Western Lower Peninsula",
     "context": "the White in Newaygo County, a quieter alternative to its larger neighbors"},
    {"slug": "pine", "name": "Pine River", "gauge": "04124500",
     "nws": (44.2483, -85.5550), "region": "Western Lower Peninsula",
     "context": "the Pine in Lake County, designated Wild and Scenic, holds wild browns"},
    {"slug": "little-manistee", "name": "Little Manistee River", "gauge": "04124200",
     "nws": (44.2658, -85.9550), "region": "Western Lower Peninsula",
     "context": "the Little Manistee, smaller cousin to the big Manistee, intimate water"},
    {"slug": "betsie", "name": "Betsie River", "gauge": "04126970",
     "nws": (44.6242, -85.9967), "region": "Western Lower Peninsula",
     "context": "the Betsie in Benzie County, a steelhead river with a strong fall run"},
    {"slug": "platte", "name": "Platte River", "gauge": "04126802",
     "nws": (44.7178, -86.0008), "region": "Western Lower Peninsula",
     "context": "the Platte through Sleeping Bear Dunes country"},
    # Upper Peninsula
    {"slug": "escanaba", "name": "Escanaba River", "gauge": "04059500",
     "nws": (46.0789, -87.1742), "region": "Upper Peninsula",
     "context": "the Escanaba in central UP, brook and brown trout in remote water"},
    {"slug": "menominee", "name": "Menominee River", "gauge": "04067500",
     "nws": (45.5550, -87.6386), "region": "Western Upper Peninsula",
     "context": "the Menominee on the Wisconsin border, a large river with mixed trout and warmwater"},
    {"slug": "sturgeon-up", "name": "Sturgeon River (UP)", "gauge": "04040500",
     "nws": (46.6483, -88.4283), "region": "Upper Peninsula",
     "context": "the UP Sturgeon in the Ottawa National Forest, remote brook trout water"},
    {"slug": "black-up", "name": "Black River (UP)", "gauge": "04031000",
     "nws": (46.5736, -90.0264), "region": "Western Upper Peninsula",
     "context": "the Black near Bessemer, famous for its waterfalls and steelhead"},
    {"slug": "ontonagon", "name": "Ontonagon River", "gauge": "04040000",
     "nws": (46.5197, -89.3158), "region": "Upper Peninsula",
     "context": "the Ontonagon system, large remote river with multiple branches"},
    {"slug": "tahquamenon", "name": "Tahquamenon River", "gauge": "04045500",
     "nws": (46.5750, -85.2547), "region": "Eastern Upper Peninsula",
     "context": "the Tahquamenon above and below the famous falls"},
    {"slug": "presque-isle", "name": "Presque Isle River", "gauge": "04032000",
     "nws": (46.6225, -89.9967), "region": "Western Upper Peninsula",
     "context": "the Presque Isle through Porcupine Mountains State Park"},
    {"slug": "au-train", "name": "Au Train River", "gauge": "04043016",
     "nws": (46.4286, -86.8408), "region": "Upper Peninsula",
     "context": "the Au Train in the Hiawatha National Forest"},
    {"slug": "thunder-bay", "name": "Thunder Bay River", "gauge": "04136000",
     "nws": (45.0667, -83.4567), "region": "Northern Lower Peninsula",
     "context": "the Thunder Bay through Alpena County, an underappreciated NLP option"},
]

# ─── Helpers ─────────────────────────────────────────────────────────────────

def log(msg):
    print(f"[{datetime.now(timezone.utc).isoformat()}] {msg}", flush=True)

def open_failure_issue(title, body):
    """Open a GitHub issue when the cron fails so it's visible next time Chris opens the repo."""
    token = os.environ.get("GH_TOKEN")
    repo = os.environ.get("GH_REPO")
    if not token or not repo:
        log("No GH_TOKEN/GH_REPO; skipping issue creation")
        return
    try:
        r = requests.post(
            f"https://api.github.com/repos/{repo}/issues",
            headers={"Authorization": f"Bearer {token}",
                     "Accept": "application/vnd.github+json"},
            json={"title": title, "body": body, "labels": ["cron-failure"]},
            timeout=30,
        )
        log(f"Issue creation: {r.status_code}")
    except Exception as e:
        log(f"Issue creation failed: {e}")

# ─── Recency check ───────────────────────────────────────────────────────────

def recent_river_slugs():
    """Return slugs of rivers covered in the last RECENCY_DAYS days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=RECENCY_DAYS)
    r = requests.get(f"{WP_API}/posts/?number=20&fields=title,date", timeout=30)
    r.raise_for_status()
    posts = r.json().get("posts", [])
    recent_titles = []
    for p in posts:
        try:
            d = datetime.fromisoformat(p["date"])
            if d.replace(tzinfo=timezone.utc if d.tzinfo is None else d.tzinfo) >= cutoff:
                recent_titles.append(p["title"].lower())
        except Exception:
            continue
    # Match each river's name against recent titles
    recent = set()
    for r_data in RIVERS:
        # Try multiple match patterns to catch variations
        n = r_data["name"].lower().replace(" river", "")
        # also handle special slugs like "sturgeon (up)"
        clean = re.sub(r"\s*\([^)]+\)\s*", "", n).strip()
        for title in recent_titles:
            if clean in title or r_data["slug"].replace("-", " ") in title:
                recent.add(r_data["slug"])
                break
    return recent

def pick_river(force_slug=""):
    """Pick a river respecting 14-day recency."""
    if force_slug:
        for r in RIVERS:
            if r["slug"] == force_slug:
                return r
        raise ValueError(f"Unknown river slug: {force_slug}")
    recent = recent_river_slugs()
    log(f"Recent (last {RECENCY_DAYS}d): {sorted(recent)}")
    candidates = [r for r in RIVERS if r["slug"] not in recent]
    if not candidates:
        log("All rivers recent; using full rotation")
        candidates = RIVERS
    # Light regional balance: bias toward the region least-represented in recent posts
    # but keep it simple and randomized so it doesn't feel mechanical
    return random.choice(candidates)

# ─── Data fetches ────────────────────────────────────────────────────────────

def fetch_usgs(gauge_id):
    """Pull current flow (cfs) + gauge height (ft) for a USGS site."""
    try:
        # parameterCd 00060 = discharge cfs, 00065 = gauge height ft
        r = requests.get(
            "https://waterservices.usgs.gov/nwis/iv/",
            params={"format": "json", "sites": gauge_id, "parameterCd": "00060,00065"},
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        out = {}
        for ts in data.get("value", {}).get("timeSeries", []):
            var = ts["variable"]["variableCode"][0]["value"]
            values = ts["values"][0]["value"]
            if not values:
                continue
            v = values[-1].get("value")
            try:
                v = float(v)
            except (TypeError, ValueError):
                continue
            if var == "00060":
                out["flow_cfs"] = v
            elif var == "00065":
                out["gauge_ft"] = v
        return out
    except Exception as e:
        log(f"USGS fetch failed for {gauge_id}: {e}")
        return {}

def fetch_nws(lat, lon):
    """Pull a 2-period NWS forecast (today + tonight) for a coordinate."""
    try:
        # 1. resolve the point → forecast URL
        headers = {"User-Agent": "michigan-trout-daily (chris@chrisizworski.com)"}
        r = requests.get(f"https://api.weather.gov/points/{lat},{lon}",
                         headers=headers, timeout=20)
        r.raise_for_status()
        fc_url = r.json()["properties"]["forecast"]
        # 2. fetch forecast
        r = requests.get(fc_url, headers=headers, timeout=20)
        r.raise_for_status()
        periods = r.json()["properties"]["periods"][:3]
        return [{"name": p["name"], "temp": p["temperature"],
                 "wind": p["windSpeed"], "short": p["shortForecast"],
                 "detailed": p["detailedForecast"]} for p in periods]
    except Exception as e:
        log(f"NWS fetch failed for {lat},{lon}: {e}")
        return []

# ─── Claude generation ───────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Chris Izworski, writing a daily trout fishing report for Michigan Trout Daily (daily.michigantroutreport.com).

Voice and style requirements (these are absolute):
- Literary, observational, place-grounded. Slow and confident. Never breezy or marketing-toned.
- NEVER use em dashes (—) or en dashes (–). Use colons, commas, semicolons, periods. If a sentence requires an em dash to feel right, restructure it.
- American English spelling throughout. No British variants.
- Slightly formal register: prefer "do not" over "don't", "you are" over "you're", etc., though some contractions are fine if they read naturally.
- Specific over generic. Real flies (Sulphur Comparadun size 14, Elk Hair Caddis size 14, Hendrickson Dry size 12). Real river places (Burton's Landing, Stephan Bridge, Wakeley, Whirlpool, Claybanks). Real time windows for hatches.
- The byline already appears at the top. Do not write a separate "By Chris Izworski" line.
- The body must begin with this exact opening pattern: "Chris Izworski, reporting from Michigan on the current state of the [River Name] this [Day of Week] morning in [season descriptor]."
- Then immediately give the flow number in cubic feet per second and the gauge height in feet if provided. Frame conditions honestly.
- Include 2-3 H2 sections. Typical patterns: "The Window This Week", "What Is Emerging Now" or "What Is Hatching", "Where to Go", "The Practical Read".
- 700-800 words.
- End with a one-paragraph pointer to https://michigantroutreport.com/ for live conditions and the network.
- Wrap each paragraph in <p>...</p>. Use <h2> for headings. No other HTML except <a> for the closing link.
"""

USER_PROMPT_TEMPLATE = """Today is {today_long}. Generate today's daily trout report.

River: {river_name}
Region: {region}
Context: {river_context}

Live USGS conditions (use these exact numbers if present, else write honestly that gauge data is unavailable today):
{usgs_block}

Local NWS forecast:
{nws_block}

Season note: We are in {season_note}. The hatches you can plausibly reference for mid-{month}: {hatch_note}.

Write the post body now. Do NOT include the byline paragraph at the top, that is added separately. Begin directly with "Chris Izworski, reporting from Michigan on the current state of...".
"""

WEEKLY_SYSTEM = SYSTEM_PROMPT  # same voice rules

WEEKLY_USER_TEMPLATE = """Today is {today_long}, a Sunday. Generate today's weekly Michigan trout rollup.

Cover the state in three regional sections (H2 each): Northern Lower Peninsula, Western Lower Peninsula, Upper Peninsula. In each, give a one-paragraph read on overall conditions, name 2-3 rivers worth attention, and call out one specific recommendation. 700-800 words total.

Opening line pattern: "Chris Izworski, reporting on the state of Michigan trout water for the week ending [Sunday date]."
End with the standard pointer to michigantroutreport.com.

Season is mid-{month}. Likely active hatches: {hatch_note}.
"""

HATCH_NOTES = {
    1: "midges, small black stoneflies",
    2: "midges, early black stoneflies",
    3: "early black stoneflies, BWOs, midges",
    4: "Hendricksons (late April), grannom caddis, BWOs",
    5: "sulphurs, caddis, late Hendricksons, March browns",
    6: "sulphurs early month, brown drakes, Isonychia, Hex (late June into July)",
    7: "Hex (early July), terrestrials (hoppers, ants, beetles), Tricos",
    8: "Tricos, terrestrials, late summer caddis",
    9: "blue winged olives, terrestrials, fall caddis, brown trout pre-spawn",
    10: "blue winged olives, brown trout spawn season, streamers",
    11: "BWOs, midges, late steelhead",
    12: "midges, winter steelhead",
}
SEASON_NOTES = {
    (3, 4, 5): "spring runoff and the opening of the season",
    (6, 7, 8): "the heart of the summer dry fly season",
    (9, 10, 11): "the fall transition and brown trout spawn",
    (12, 1, 2): "winter steelhead and the slow months",
}

def season_for(month):
    for months, note in SEASON_NOTES.items():
        if month in months:
            return note
    return "the current season"

def claude_generate(system, user):
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY secret is not set on the repository. "
            "Add it at: Settings > Secrets and variables > Actions > New repository secret. "
            "Name: ANTHROPIC_API_KEY  Value: your key from console.anthropic.com")
    r = requests.post(
        ANTHROPIC_API,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": CLAUDE_MODEL,
            "max_tokens": 2400,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        },
        timeout=120,
    )
    if r.status_code != 200:
        raise RuntimeError(f"Anthropic API {r.status_code}: {r.text[:500]}")
    data = r.json()
    return "".join(block["text"] for block in data["content"] if block["type"] == "text")

# ─── Validation ──────────────────────────────────────────────────────────────

def validate(body_html):
    """Hard checks. Raises on failure so the run opens a GitHub issue."""
    if "\u2014" in body_html or "&mdash;" in body_html:
        raise ValueError("em dash present in generated body")
    plain = re.sub(r"<[^>]+>", " ", body_html)
    plain = re.sub(r"\s+", " ", plain).strip()
    first100 = " ".join(plain.split()[:100])
    if "Chris Izworski" not in first100:
        raise ValueError("'Chris Izworski' missing in first 100 words")
    wc = len(plain.split())
    if wc < 500:
        raise ValueError(f"body too short: {wc} words")
    if wc > 1300:
        raise ValueError(f"body too long: {wc} words")
    # Anglo-English quick check
    for bad in ["modelled", "colour", "favourite", "centre,", "centre.",
                "centre ", "organised", "behaviour", "labour"]:
        if bad in body_html.lower():
            raise ValueError(f"anglo-English term: {bad}")
    return wc

# ─── Build + publish ─────────────────────────────────────────────────────────

def build_post(force_slug="", today=None):
    today = today or datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=-4)))
    is_sunday = today.weekday() == 6
    month = today.month
    hatch_note = HATCH_NOTES.get(month, "seasonal hatches")
    season_note = season_for(month)
    today_long = today.strftime("%A, %B %-d, %Y")
    today_short = today.strftime("%B %-d, %Y")
    date_label = today.strftime("%B %-d, %Y")
    weekday = today.strftime("%A")

    byline = (f'<p style="font-size:0.85em;color:#666;margin-bottom:1.5em">'
              f'By <a href="https://chrisizworski.com">{AUTHOR_NAME}</a> '
              f'&nbsp;|&nbsp; Michigan Trout Daily &nbsp;|&nbsp; {date_label}</p>\n')

    if is_sunday and not force_slug:
        log(f"Sunday → weekly rollup")
        user = WEEKLY_USER_TEMPLATE.format(today_long=today_long, month=today.strftime("%B"),
                                           hatch_note=hatch_note)
        body = claude_generate(WEEKLY_SYSTEM, user)
        body = body.strip()
        slug_date = today.strftime("%Y-%m-%d")
        slug = f"michigan-trout-daily-weekly-overview-sunday-{today.strftime('%B-%-d-%Y').lower().replace(' ', '-')}"
        title = f"Michigan Trout Daily Weekly Overview: Sunday, {today_short}"
        tags = ["weekly overview", "michigan trout", "fly fishing michigan",
                "trout stream conditions", "Northern Lower Peninsula",
                "Western Lower Peninsula", "Upper Peninsula"]
    else:
        river = pick_river(force_slug)
        log(f"River: {river['name']} ({river['slug']})")
        usgs = fetch_usgs(river["gauge"])
        nws = fetch_nws(*river["nws"])
        usgs_block = ""
        if usgs:
            if "flow_cfs" in usgs:
                usgs_block += f"Flow: {usgs['flow_cfs']:,.0f} cfs at gauge {river['gauge']}.\n"
            if "gauge_ft" in usgs:
                usgs_block += f"Gauge height: {usgs['gauge_ft']:.1f} ft.\n"
        else:
            usgs_block = "Gauge data unavailable today."
        nws_block = ""
        if nws:
            for p in nws:
                nws_block += f"- {p['name']}: {p['short']}, {p['temp']}°F, wind {p['wind']}.\n"
        else:
            nws_block = "Forecast unavailable."

        user = USER_PROMPT_TEMPLATE.format(
            today_long=today_long, river_name=river["name"],
            region=river["region"], river_context=river["context"],
            usgs_block=usgs_block.strip(), nws_block=nws_block.strip(),
            season_note=season_note, month=today.strftime("%B"),
            hatch_note=hatch_note,
        )
        body = claude_generate(SYSTEM_PROMPT, user).strip()
        # Slug: river-name + month + day + descriptor
        slug = f"{river['slug']}-{today.strftime('%B').lower()}-{today.day}-daily-report"
        slug = re.sub(r"[^a-z0-9-]", "-", slug)
        slug = re.sub(r"-+", "-", slug).strip("-")
        # Title: extract subhead from first H2 or just use a default
        title = f"{river['name']}, {today.strftime('%B %-d')}: Daily Stream Report"
        # Try to find a more interesting subtitle in the body
        h2 = re.search(r"<h2>([^<]+)</h2>", body)
        if h2:
            sub = h2.group(1).strip().rstrip(".")
            # Only use it if it's tactical-feeling, not the standard header
            if sub.lower() not in ("the window this week", "what is emerging now",
                                   "where to go", "the practical read", "what is hatching"):
                title = f"{river['name']}, {today.strftime('%B %-d')}: {sub}"
        tags = [river["name"], "fly fishing michigan", "michigan trout",
                "brown trout", "trout stream conditions", river["region"]]

    wc = validate(body)
    log(f"Generated {wc} words")
    full_body = byline + body
    return {
        "title": title, "slug": slug, "body": full_body, "tags": tags,
        "post_date": today.strftime("%Y-%m-%dT09:12:00-04:00"),
    }

def publish_to_wp(post):
    token = os.environ["WP_TOKEN"]
    r = requests.post(
        f"{WP_API}/posts/new",
        data={
            "title": post["title"],
            "content": post["body"],
            "slug": post["slug"],
            "status": "publish",
            "tags": ",".join(post["tags"]),
            "type": "post",
        },
        headers={"Authorization": f"Bearer {token}"},
        timeout=60,
    )
    if r.status_code != 200:
        raise RuntimeError(f"WP publish failed {r.status_code}: {r.text[:500]}")
    return r.json()

def indexnow_ping(url):
    key = os.environ.get("INDEXNOW_KEY", "")
    if not key:
        log("No INDEXNOW_KEY; skipping ping")
        return
    try:
        r = requests.post(
            "https://api.indexnow.org/indexnow",
            json={
                "host": "daily.michigantroutreport.com",
                "key": key,
                "keyLocation": f"{SITE_URL}/{key}.txt",
                "urlList": [url, f"{SITE_URL}/", f"{SITE_URL}/sitemap.xml"],
            },
            timeout=20,
        )
        log(f"IndexNow: {r.status_code}")
    except Exception as e:
        log(f"IndexNow ping failed: {e}")


def already_published_today():
    """Skip if the old (external) cron already posted today.
    Avoids duplicate posts now that both crons are alive."""
    et = datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=-4)))
    today_str = et.strftime("%Y-%m-%d")
    try:
        r = requests.get(f"{WP_API}/posts/?number=5&fields=date,title,slug,status",
                         timeout=20)
        r.raise_for_status()
        for p in r.json().get("posts", []):
            if p.get("status") != "publish":
                continue
            if p.get("date", "").startswith(today_str):
                log(f"Dedup: existing post for {today_str} → '{p.get('title')}' "
                    f"(slug={p.get('slug')}). Skipping.")
                return True
        return False
    except Exception as e:
        log(f"Dedup check failed (non-fatal, proceeding): {e}")
        return False


def main():
    try:
        # Skip if old cron already published today
        force = os.environ.get("RIVER_OVERRIDE", "").strip()
        if not force and already_published_today():
            log("Old cron beat us today; nothing to do.")
            return
        dry = os.environ.get("DRY_RUN", "").lower() == "true"
        post = build_post(force_slug=force)
        log(f"Title: {post['title']}")
        log(f"Slug: {post['slug']}")
        if dry:
            log("DRY RUN — not publishing")
            print(post["body"][:2000])
            return
        result = publish_to_wp(post)
        live_url = f"{SITE_URL}/post/{post['slug']}"
        log(f"Published: WP ID={result.get('ID')} → {live_url}")
        indexnow_ping(live_url)
        log("OK")
    except Exception as e:
        tb = traceback.format_exc()
        log(f"FAILURE: {e}\n{tb}")
        open_failure_issue(
            f"Daily publish failure: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
            f"## Cron failure\n\n```\n{tb}\n```\n\n"
            f"Check the workflow run for full logs. The site will be stale until this is fixed.",
        )
        sys.exit(1)

if __name__ == "__main__":
    main()
