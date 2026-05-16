"""
Sanity check: every reference solution in the given OckBench JSONL file(s)
must satisfy every assert in metadata.test_list.

Usage:
  python scripts/verify-hard-chaos.py
  python scripts/verify-hard-chaos.py data/OckBench_coding_hard_chaos.jsonl data/OckBench_coding_hard_chaos_200.jsonl
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PATHS = [
    ROOT / "data" / "OckBench_coding_hard_chaos.jsonl",
    ROOT / "data" / "OckBench_coding_hard_chaos_200.jsonl",
]


def verify(path: Path) -> tuple[int, list[str]]:
    failures: list[str] = []
    total = 0
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            total += 1
            ref = row["metadata"]["reference_code"]
            tests = row["metadata"]["test_list"]
            ns: dict[str, object] = {}
            try:
                exec(ref, ns)
            except Exception as exc:  # noqa: BLE001
                failures.append(f"id={row['id']} reference_code raised: {exc!r}")
                continue
            for t in tests:
                try:
                    exec(t, ns)
                except AssertionError:
                    failures.append(f"id={row['id']} FAILED: {t}")
                except Exception as exc:  # noqa: BLE001
                    failures.append(f"id={row['id']} ERROR ({exc!r}) for: {t}")
    return total, failures


def main() -> int:
    paths = [Path(p) for p in sys.argv[1:]] if len(sys.argv) > 1 else DEFAULT_PATHS
    overall_ok = True
    for path in paths:
        if not path.exists():
            print(f"Missing dataset: {path}", file=sys.stderr)
            overall_ok = False
            continue
        total, failures = verify(path)
        if failures:
            overall_ok = False
            print(f"[{path.name}] {len(failures)} failures (of {total}):")
            for f in failures:
                print("  -", f)
        else:
            print(f"[{path.name}] OK — {total} problems verified, all asserts pass.")
    return 0 if overall_ok else 1


if __name__ == "__main__":
    sys.exit(main())
