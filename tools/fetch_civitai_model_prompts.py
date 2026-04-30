"""
Fetch all image prompts for a Civitai model version via public REST API (cursor pagination).
Writes UTF-8 CSV with id, username, url, created_at, prompt, negative_prompt.

Prefer --model-version-id (per-version gallery); --model-id alone often returns a small
subset without nextPage on the public API.

Usage:
  python tools/fetch_civitai_model_prompts.py [--model-version-id 392786] [--nsfw X] [--out path.csv]
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API_BASE = "https://civitai.com/api/v1/images"


def fetch_page(url: str, timeout: float = 60.0) -> dict:
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "sdweb-easy-prompt-selector/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def extract_prompts(item: dict) -> tuple[str, str]:
    meta = item.get("meta") or {}
    inner = meta.get("meta") if isinstance(meta.get("meta"), dict) else meta
    if not isinstance(inner, dict):
        return "", ""
    p = inner.get("prompt")
    n = inner.get("negativePrompt")
    return (p if isinstance(p, str) else ""), (n if isinstance(n, str) else "")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model-id", type=int, default=0, help="Civitai model id (optional if model-version-id set)")
    ap.add_argument(
        "--model-version-id",
        type=int,
        default=392786,
        help="Civitai model version id (AnimeBoysXL v3.0 = 392786); required for full gallery pagination",
    )
    ap.add_argument(
        "--nsfw",
        default="X",
        help="Civitai nsfw filter: None, Soft, Mature, X (see API docs)",
    )
    ap.add_argument("--limit", type=int, default=100, help="Items per page (max typically 200)")
    ap.add_argument("--sleep", type=float, default=0.35, help="Seconds between API calls")
    ap.add_argument("--max-pages", type=int, default=0, help="Stop after N pages (0 = no limit)")
    ap.add_argument(
        "--out",
        default="civitai_animeboysxl_v3_prompts.csv",
        help="Output CSV path",
    )
    args = ap.parse_args()

    params: dict[str, str | int] = {
        "limit": min(max(args.limit, 1), 200),
    }
    if args.model_version_id:
        params["modelVersionId"] = args.model_version_id
    elif args.model_id:
        params["modelId"] = args.model_id
    else:
        print("Provide --model-version-id or --model-id", file=sys.stderr)
        return 2
    if args.nsfw:
        params["nsfw"] = args.nsfw

    url = f"{API_BASE}?{urllib.parse.urlencode(params)}"
    total_rows = 0
    page_num = 0

    fieldnames = ["image_id", "username", "image_url", "created_at", "prompt", "negative_prompt"]

    with open(args.out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()

        while url:
            page_num += 1
            if args.max_pages and page_num > args.max_pages:
                break
            try:
                data = fetch_page(url)
            except urllib.error.HTTPError as e:
                print(f"HTTP error: {e}", file=sys.stderr)
                return 1
            except Exception as e:
                print(f"Request failed: {e}", file=sys.stderr)
                return 1

            items = data.get("items") or []
            for it in items:
                pid = it.get("id")
                user = it.get("username") or ""
                iurl = it.get("url") or ""
                created = it.get("createdAt") or ""
                prompt, neg = extract_prompts(it)
                w.writerow(
                    {
                        "image_id": pid,
                        "username": user,
                        "image_url": iurl,
                        "created_at": created,
                        "prompt": prompt,
                        "negative_prompt": neg,
                    }
                )
                total_rows += 1

            meta = data.get("metadata") or {}
            url = meta.get("nextPage") or ""
            if url:
                time.sleep(args.sleep)

            if page_num % 10 == 0:
                print(f"pages={page_num} rows={total_rows}", flush=True)

    print(f"Done. rows={total_rows} out={args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
