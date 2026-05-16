"""Quantify LLMLingua-2's compression on OMH-Polyglot.

Reads the offline-batch output produced by
``benchmark-proxy/llmlingua2_proxy.py --offline`` and compares it against the
raw benchmark, using ``cl100k_base`` so the numbers are directly comparable to
Table 3 in the paper (which is what the gpt-3.5-turbo column reports).

The script answers three questions in one pass:

1. **How much does LLMLingua-2 actually save in cloud-billing units?**
   The offline log reports compression in XLM-RoBERTa tokens; that is not the
   unit the cloud charges in. We re-tokenise the rebuilt prompt under
   cl100k_base and report % reduction vs raw and (via Table 3) vs the Ours
   arm.
2. **Has LLMLingua-2 silently dropped critical semantics?**
   We print stratified raw-vs-compressed diffs across every multilingual
   style in OMH-Polyglot and flag rows with the largest byte-loss, plus rows
   where the target function name disappeared from the compressed body.
3. **What's the per-prompt latency budget?**
   Mean/median/p90 of the per-row compression_latency_ms from the offline
   batch, for direct comparison with the §5.6 numbers (118-279 ms in the
   TS proxy).

Usage::

    pip install tiktoken
    python scripts/analyze-llmlingua2-output.py \\
        --raw  data/OckBench_coding_polyglot_hard_200.jsonl \\
        --llmlingua2 data/OckBench_coding_polyglot_hard_200.llmlingua2.jsonl
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path
from typing import Iterable

try:
    import tiktoken
except ImportError as exc:
    raise SystemExit("tiktoken is required. Run: pip install tiktoken") from exc


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_RAW = ROOT / "data" / "OckBench_coding_polyglot_hard_200.jsonl"
DEFAULT_LL2 = ROOT / "data" / "OckBench_coding_polyglot_hard_200.llmlingua2.jsonl"

# Table 3 prompt-token totals (cl100k_base for gpt-3.5-turbo), reproduced
# here for the headline reduction comparison without having to re-run the
# cloud benchmark.
TABLE3_PROMPT_TOTAL_RAW = 53_713          # paper Table 3, gpt-3.5-turbo Raw
TABLE3_PROMPT_TOTAL_OURS = 28_661         # paper Table 3, gpt-3.5-turbo Ours

ENC = tiktoken.get_encoding("cl100k_base")


def load_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def tok(s: str) -> int:
    return len(ENC.encode(s))


def raw_user_prompt(row: dict) -> str:
    """Reconstruct what OckBench actually sends as the user message:
    the natural-language problem text followed by the executable asserts.
    """
    asserts = (row.get("metadata") or {}).get("test_list") or []
    body = row.get("problem") or ""
    if asserts:
        return f"{body}\n\n" + "\n".join(asserts)
    return body


def first_n_words(s: str, n: int = 80) -> str:
    flat = " ".join(s.split())
    return flat if len(flat) <= n * 6 else flat[: n * 6] + "…"


def aggregate_tokens(
    raw_rows: list[dict], ll2_rows: list[dict]
) -> tuple[dict, dict, dict]:
    """Return three dicts keyed by `id`:
        raw_tokens[id]         -> cl100k tokens of the raw user message
        ll2_tokens[id]         -> cl100k tokens of the LLMLingua-2 rebuilt user message
        latency_ms[id]         -> per-row compression latency (ms)
    """
    raw_tokens: dict[int, int] = {}
    for row in raw_rows:
        raw_tokens[row["id"]] = tok(raw_user_prompt(row))

    ll2_tokens: dict[int, int] = {}
    latency_ms: dict[int, float] = {}
    for row in ll2_rows:
        compressed = row.get("compressed_problem") or raw_user_prompt(row)
        ll2_tokens[row["id"]] = tok(compressed)
        latency_ms[row["id"]] = float(row.get("compression_latency_ms") or 0.0)
    return raw_tokens, ll2_tokens, latency_ms


def per_style_reduction(
    raw_rows: list[dict],
    raw_tokens: dict[int, int],
    ll2_tokens: dict[int, int],
) -> None:
    by_style_raw: dict[str, int] = defaultdict(int)
    by_style_ll2: dict[str, int] = defaultdict(int)
    by_style_n: dict[str, int] = defaultdict(int)
    for row in raw_rows:
        style = (row.get("metadata") or {}).get("style", "default")
        by_style_raw[style] += raw_tokens[row["id"]]
        by_style_ll2[style] += ll2_tokens.get(row["id"], 0)
        by_style_n[style] += 1

    print(f"\n=== Per-style prompt-token reduction (cl100k_base) ===")
    print(
        f"  {'style':<22s} {'n':>3s}  {'raw':>8s}  {'ll2':>8s}  {'delta%':>7s}"
    )
    for style in sorted(by_style_raw):
        raw_n = by_style_raw[style]
        ll2_n = by_style_ll2[style]
        pct = (ll2_n / raw_n - 1.0) * 100.0 if raw_n else 0.0
        print(
            f"  {style:<22s} {by_style_n[style]:>3d}  {raw_n:>8d}  {ll2_n:>8d}  {pct:>+6.1f}%"
        )


def headline_summary(
    raw_tokens: dict[int, int],
    ll2_tokens: dict[int, int],
    latency_ms: dict[int, float],
) -> None:
    total_raw = sum(raw_tokens.values())
    total_ll2 = sum(ll2_tokens.values())
    delta_pct = (total_ll2 / total_raw - 1.0) * 100.0 if total_raw else 0.0

    lats = list(latency_ms.values())
    mean_lat = statistics.mean(lats) if lats else 0.0
    p50_lat = statistics.median(lats) if lats else 0.0
    p90_lat = (
        statistics.quantiles(lats, n=10)[8] if len(lats) >= 10 else max(lats or [0.0])
    )

    print("\n=== Headline summary (cl100k_base, 200 rows) ===")
    print(f"  Raw         total prompt tokens : {total_raw:>8d}")
    print(f"  LLMLingua-2 total prompt tokens : {total_ll2:>8d}  ({delta_pct:+.1f}%)")
    print(
        f"  (paper Table 3, Ours/gpt-3.5-turbo prompt: {TABLE3_PROMPT_TOTAL_OURS}, "
        f"i.e. {(TABLE3_PROMPT_TOTAL_OURS / TABLE3_PROMPT_TOTAL_RAW - 1) * 100:+.1f}% vs Raw)"
    )
    print(f"\n  Compression latency / prompt    : "
          f"mean={mean_lat:.0f} ms  median={p50_lat:.0f} ms  p90={p90_lat:.0f} ms")


def show_stratified_samples(
    raw_rows: list[dict], ll2_rows: list[dict], k_per_style: int = 1
) -> None:
    """Print one raw-vs-compressed sample per multilingual style."""
    ll2_by_id = {r["id"]: r for r in ll2_rows}
    seen_styles: dict[str, int] = defaultdict(int)
    print("\n=== Qualitative samples (1 per style) ===")
    for row in raw_rows:
        style = (row.get("metadata") or {}).get("style", "default")
        if seen_styles[style] >= k_per_style:
            continue
        seen_styles[style] += 1
        ll2 = ll2_by_id.get(row["id"], {})
        raw_body = row.get("problem") or ""
        # Reconstruct the compressed NL body (compressed_problem includes
        # asserts re-appended; strip them off for the side-by-side).
        compressed_body = (ll2.get("compressed_problem") or "").split("\nassert ")[0]
        fn = (row.get("metadata") or {}).get("function_name") or ""
        kept_fn = fn and fn in compressed_body
        print(f"\n  --- id={row['id']}  style={style}  fn={fn}"
              f"  fn_kept={kept_fn} ---")
        print(f"    RAW  : {first_n_words(raw_body)}")
        print(f"    LL2  : {first_n_words(compressed_body)}")


def flag_function_name_drops(
    raw_rows: list[dict], ll2_rows: list[dict]
) -> list[dict]:
    """Rows where the target function identifier disappeared from the
    compressed body. The asserts still carry the name (we preserve them) but
    LLMLingua-2 dropping it from the NL part is a yellow flag for downstream
    accuracy.
    """
    ll2_by_id = {r["id"]: r for r in ll2_rows}
    flagged: list[dict] = []
    for row in raw_rows:
        fn = (row.get("metadata") or {}).get("function_name") or ""
        if not fn:
            continue
        ll2 = ll2_by_id.get(row["id"], {})
        compressed_body = (ll2.get("compressed_problem") or "").split("\nassert ")[0]
        raw_body = row.get("problem") or ""
        if fn in raw_body and fn not in compressed_body:
            flagged.append(
                {
                    "id": row["id"],
                    "style": (row.get("metadata") or {}).get("style"),
                    "fn": fn,
                }
            )
    print(
        f"\n=== Function-name drops (NL body only; asserts unaffected) "
        f"=== {len(flagged)} / {len(raw_rows)}"
    )
    for f in flagged[:20]:
        print(f"  id={f['id']:>3d}  style={f['style']:<22s}  fn={f['fn']}")
    if len(flagged) > 20:
        print(f"  …and {len(flagged) - 20} more.")
    return flagged


def top_byte_loss(
    raw_rows: list[dict], ll2_rows: list[dict], k: int = 5
) -> None:
    """Show the K rows where LLMLingua-2 dropped the highest fraction of
    the original byte length. Useful for spotting catastrophic over-pruning.
    """
    ll2_by_id = {r["id"]: r for r in ll2_rows}
    scored: list[tuple[float, dict]] = []
    for row in raw_rows:
        raw_body = row.get("problem") or ""
        if not raw_body:
            continue
        compressed_body = (
            (ll2_by_id.get(row["id"], {}).get("compressed_problem") or "")
            .split("\nassert ")[0]
        )
        ratio = len(compressed_body) / max(1, len(raw_body))
        scored.append((ratio, row))
    scored.sort(key=lambda x: x[0])  # ascending = worst loss first

    print(f"\n=== Top-{k} byte-loss rows (most aggressive compression) ===")
    for ratio, row in scored[:k]:
        style = (row.get("metadata") or {}).get("style", "default")
        fn = (row.get("metadata") or {}).get("function_name") or ""
        compressed_body = (
            (ll2_by_id.get(row["id"], {}).get("compressed_problem") or "")
            .split("\nassert ")[0]
        )
        print(f"\n  id={row['id']:>3d}  style={style:<22s}  fn={fn}  "
              f"byte_ratio={ratio:.2f}")
        print(f"    RAW  : {first_n_words(row.get('problem') or '')}")
        print(f"    LL2  : {first_n_words(compressed_body)}")


def main(argv: Iterable[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    p.add_argument("--llmlingua2", type=Path, default=DEFAULT_LL2)
    p.add_argument("--samples-per-style", type=int, default=1)
    p.add_argument("--top-byte-loss", type=int, default=5)
    args = p.parse_args(list(argv) if argv is not None else None)

    if not args.raw.exists():
        print(f"Raw JSONL not found: {args.raw}", file=sys.stderr)
        return 2
    if not args.llmlingua2.exists():
        print(f"LLMLingua-2 JSONL not found: {args.llmlingua2}", file=sys.stderr)
        return 2

    raw_rows = load_jsonl(args.raw)
    ll2_rows = load_jsonl(args.llmlingua2)
    print(f"Loaded raw={len(raw_rows)}  llmlingua2={len(ll2_rows)}")

    raw_tokens, ll2_tokens, latency_ms = aggregate_tokens(raw_rows, ll2_rows)
    headline_summary(raw_tokens, ll2_tokens, latency_ms)
    per_style_reduction(raw_rows, raw_tokens, ll2_tokens)
    flag_function_name_drops(raw_rows, ll2_rows)
    top_byte_loss(raw_rows, ll2_rows, k=args.top_byte_loss)
    show_stratified_samples(raw_rows, ll2_rows, k_per_style=args.samples_per_style)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
