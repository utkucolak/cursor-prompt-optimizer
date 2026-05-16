"""
Compare per-prompt token cost between the chaos benchmark (English spec
+ foreign-language fluff) and the polyglot benchmark (technical content
in foreign / mixed languages) using OpenAI's cl100k_base / o200k_base
tokenizers.

Reports:
  * Mean / median tokens per prompt, per style
  * Tokenizer tax ratio (foreign-language prompt tokens / English equivalent)
  * Per-style breakdown for the polyglot benchmark

Usage:
  pip install tiktoken
  python scripts/analyze-tokenizer-tax.py
"""
from __future__ import annotations

import json
import statistics
from collections import defaultdict
from pathlib import Path

try:
    import tiktoken
except ImportError as e:
    raise SystemExit("tiktoken is required. Run: pip install tiktoken") from e

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

CHAOS = DATA / "OckBench_coding_hard_chaos_200.jsonl"
POLYGLOT = DATA / "OckBench_coding_polyglot_hard_200.jsonl"

ENC = tiktoken.get_encoding("cl100k_base")  # gpt-4o uses o200k_base, but cl100k still standard for comparison


def load(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def tok(s: str) -> int:
    return len(ENC.encode(s))


def english_floor(rows: list[dict]) -> dict[str, int]:
    """Approximate English-only floor: function name + assert lines only."""
    out = {}
    for r in rows:
        fn = r["metadata"].get("function_name", "")
        asserts = "\n".join(r["metadata"]["test_list"])
        floor_text = f"Implement {fn} so the asserts below pass.\n{asserts}"
        out[r["id"]] = tok(floor_text)
    return out


def summarize(rows: list[dict], label: str) -> None:
    by_style: dict[str, list[int]] = defaultdict(list)
    overall: list[int] = []
    for r in rows:
        n = tok(r["problem"])
        overall.append(n)
        style = r.get("metadata", {}).get("style", "default")
        by_style[style].append(n)

    print(f"\n=== {label}  (N={len(overall)}) ===")
    print(f"  overall mean   : {statistics.mean(overall):7.1f}")
    print(f"  overall median : {statistics.median(overall):7.1f}")
    print(f"  overall total  : {sum(overall):7d}")
    if len(by_style) > 1:
        print("  per-style mean tokens:")
        for style, vals in sorted(by_style.items()):
            print(f"    {style:18s} mean={statistics.mean(vals):6.1f}  total={sum(vals):5d}  n={len(vals)}")


def tax_ratio(rows: list[dict], floor: dict[str, int], label: str) -> None:
    ratios = [tok(r["problem"]) / floor[r["id"]] for r in rows if floor[r["id"]] > 0]
    print(f"\n=== Tokenizer-tax ratio (prompt / English floor) — {label} ===")
    print(f"  mean    : {statistics.mean(ratios):.2f}x")
    print(f"  median  : {statistics.median(ratios):.2f}x")
    print(f"  p90     : {statistics.quantiles(ratios, n=10)[8]:.2f}x")
    print(f"  max     : {max(ratios):.2f}x")


def main() -> None:
    chaos = load(CHAOS)
    polyglot = load(POLYGLOT)

    summarize(chaos, "OckBench_coding_hard_chaos_200")
    summarize(polyglot, "OckBench_coding_polyglot_hard_200")

    floor_chaos = english_floor(chaos)
    floor_poly = english_floor(polyglot)
    tax_ratio(chaos, floor_chaos, "chaos")
    tax_ratio(polyglot, floor_poly, "polyglot")


if __name__ == "__main__":
    main()
