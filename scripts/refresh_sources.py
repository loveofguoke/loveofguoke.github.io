"""Refresh public feed metadata; curation stays in data/sources.json."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import json
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


def canonical(url):
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query) if not k.startswith("utm_")]
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/"), urlencode(query), ""))


def local(tag):
    return tag.rsplit("}", 1)[-1]


def child_text(element, names):
    return next(("".join(c.itertext()).strip() for c in element if local(c.tag) in names), "")


def date_value(raw):
    if not raw:
        return None
    try:
        value = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        try:
            value = parsedate_to_datetime(raw)
        except (ValueError, TypeError):
            return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


def parse_feed(data, source):
    root = ET.fromstring(data)
    entries = []
    for element in root.iter():
        if local(element.tag) not in ("item", "entry"):
            continue
        title = child_text(element, {"title"})
        link = child_text(element, {"link"})
        for child in element:
            if local(child.tag) == "link" and child.get("rel", "alternate") == "alternate":
                link = child.get("href") or link
        if not title or urlsplit(link).scheme not in ("http", "https"):
            continue
        entries.append({"title": title[:400], "url": canonical(link), "source_id": source["id"],
                        "published_at": date_value(child_text(element, {"published", "pubDate", "date"})),
                        "status": "feed-candidate"})
    return entries[:30]


def collect(source):
    if not source.get("feed"):
        return source["id"], [], {"status": "manual", "message": "无订阅源，按需人工复核"}
    try:
        request = Request(source["feed"], headers={"User-Agent": "GuokeFieldnotes/1.0 (+https://loveofguoke.github.io/atlas/)"})
        with urlopen(request, timeout=18) as response:
            data = response.read(8_000_001)
        if len(data) > 8_000_000:
            raise ValueError("feed exceeds 8 MB")
        entries = parse_feed(data, source)
        if not entries:
            raise ValueError("no valid entries")
        return source["id"], entries, {"status": "ok", "count": len(entries)}
    except Exception as error:
        return source["id"], [], {"status": "error", "message": f"{type(error).__name__}: {str(error)[:180]}"}


def validate(catalog):
    ids, urls = set(), set()
    for source in catalog["sources"]:
        for key in ("id", "name", "url", "kind", "topics", "language", "reason", "entry"):
            if not source.get(key):
                raise ValueError(f"Missing {key}: {source}")
        if source["id"] in ids or canonical(source["url"]) in urls:
            raise ValueError(f"Duplicate source: {source['id']}")
        ids.add(source["id"])
        urls.add(canonical(source["url"]))
        for url in (source["url"], source["entry"]["url"], source.get("feed", source["url"])):
            if urlsplit(url).scheme != "https":
                raise ValueError(f"Only HTTPS links are allowed: {url}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="Validate and export catalog without fetching")
    args = parser.parse_args()
    catalog = json.loads((ROOT / "data/sources.json").read_text(encoding="utf-8"))
    validate(catalog)
    target = ROOT / "docs/atlas/catalog.json"
    old = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {}
    statuses = old.get("feed_status", {})
    entries = old.get("entries", [])
    if not args.offline:
        retained = {s["id"] for s in catalog["sources"]}
        entries = [e for e in entries if e["source_id"] in retained]
        with ThreadPoolExecutor(max_workers=4) as executor:
            for source_id, fresh, status in executor.map(collect, catalog["sources"]):
                statuses[source_id] = status
                entries.extend(fresh)
        by_url = {}
        for entry in entries:
            by_url[canonical(entry["url"])] = entry
        entries = sorted(by_url.values(), key=lambda e: (e.get("published_at") or "", e["url"]), reverse=True)[:240]
    output = {**catalog, "entries": entries, "feed_status": statuses,
              "collected_at": old.get("collected_at") if args.offline else datetime.now(timezone.utc).isoformat()}
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    failures = [key for key, value in statuses.items() if value["status"] == "error"]
    print(f"{len(catalog['sources'])} sources; {len(entries)} deduplicated candidates; failed feeds: {', '.join(failures) or 'none'}")
    if not args.offline and not any(v["status"] == "ok" for v in statuses.values()):
        raise SystemExit("All feeds failed; retained previous entries, inspect network before retrying")


if __name__ == "__main__":
    main()
