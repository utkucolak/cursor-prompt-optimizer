"""LLMLingua-2 benchmark proxy.

A drop-in OpenAI-compatible server that mirrors `proxy.ts` but replaces the
Ollama / Llama-3.2 rewrite stage with Microsoft's LLMLingua-2 token-classification
compressor. Point OckBench at this proxy's port (default 4001) instead of the
TypeScript proxy's port (4000) to obtain the head-to-head baseline cell discussed
in the paper's Section 5 follow-up.

Design choices that mirror `proxy.ts` for fairness:
    * Same request shape (`POST /v1/chat/completions`).
    * Same response shape (OpenAI chat-completions JSON).
    * `<solution>` re-wrap of ```python fenced output (so OckBench's extractor works
      against Gemini in particular).
    * 5% token-budget guard: if the compressed payload is not at least 5% smaller
      than the raw input, forward the raw prompt unchanged.
    * Assert lines are split off the user prompt and concatenated back verbatim
      after compression so the executable grader is never corrupted by lossy
      token pruning.

Environment variables:
    PORT                          (default 4001)
    LLMLINGUA_MODEL               (default microsoft/llmlingua-2-xlm-roberta-large-meetingbank)
    LLMLINGUA_RATE                (default 0.6; fraction of tokens to KEEP)
    LLMLINGUA_TARGET_TOKEN        (optional absolute target; overrides RATE when >0)
    LLMLINGUA_DEVICE              (default cpu; set to cuda or mps if available)
    LLMLINGUA_PRESERVE_ASSERTS    (default true; split assert lines and re-attach)
    TOKEN_BUDGET_THRESHOLD        (default 0.95; forward raw if compressed >= 95% of raw)
    CLOUD_PROVIDER                openai | anthropic   (default openai)
    CLOUD_BASE_URL                (default https://api.openai.com)
    CLOUD_API_KEY                 required
    CLOUD_MODEL                   (default gpt-4o)
    DEBUG_PROMPT                  (default false)

Usage:
    python -m pip install -r requirements-llmlingua2.txt
    python llmlingua2_proxy.py

Then point your OckBench OpenAI-compatible base URL at http://localhost:4001.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass
from typing import Any

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("llmlingua2-proxy")


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PORT = int(os.environ.get("PORT", "4001"))
LLMLINGUA_MODEL = os.environ.get(
    "LLMLINGUA_MODEL", "microsoft/llmlingua-2-xlm-roberta-large-meetingbank"
).strip()
LLMLINGUA_RATE = float(os.environ.get("LLMLINGUA_RATE", "0.6"))
LLMLINGUA_TARGET_TOKEN = int(os.environ.get("LLMLINGUA_TARGET_TOKEN", "0") or "0")
LLMLINGUA_DEVICE = os.environ.get("LLMLINGUA_DEVICE", "cpu").strip()
LLMLINGUA_PRESERVE_ASSERTS = (
    os.environ.get("LLMLINGUA_PRESERVE_ASSERTS", "true").lower() == "true"
)
TOKEN_BUDGET_THRESHOLD = float(os.environ.get("TOKEN_BUDGET_THRESHOLD", "0.95"))

CLOUD_PROVIDER = os.environ.get("CLOUD_PROVIDER", "openai").lower().strip()
CLOUD_BASE_URL = os.environ.get("CLOUD_BASE_URL", "https://api.openai.com").rstrip("/")
CLOUD_API_KEY = os.environ.get("CLOUD_API_KEY", "")
CLOUD_MODEL = os.environ.get("CLOUD_MODEL", "gpt-4o").strip()
DEBUG_PROMPT = os.environ.get("DEBUG_PROMPT", "false").lower() == "true"

# Mirror the TS proxy's system prompt so any A/B difference is attributable to
# the user-message rewrite alone.
REQUIRED_SYSTEM_TEXT = (
    "Expert Python developer. Write clean, maintainable code; "
    "one focused change at a time."
)

# Force-keep these tokens so LLMLingua-2 cannot drop syntactic structure that
# the cloud model needs to parse the residual specification cleanly. This is
# the same set recommended for code-adjacent prompts in the LLMLingua-2 README.
FORCE_TOKENS = ["\n", ".", "!", "?", ",", ":", ";", "(", ")", "[", "]", "{", "}", "=", "<", ">"]


# ---------------------------------------------------------------------------
# Compressor singleton
# ---------------------------------------------------------------------------

@dataclass
class CompressionResult:
    """Outcome of one compression pass; mirrors the TS proxy's validation
    state machine just enough for token-budget accounting."""

    compressed_prompt: str
    origin_tokens: int
    compressed_tokens: int
    latency_ms: float
    used_compression: bool  # False -> raw prompt forwarded


class CompressorSingleton:
    """Lazy-loaded LLMLingua-2 PromptCompressor.

    Loading the XLM-R-large checkpoint takes ~5-10s on CPU and pegs ~1.5 GB of
    RAM, so we initialise on first request rather than at import time. This
    keeps Flask startup snappy and lets us print a clear error if the user
    forgot to `pip install llmlingua`.
    """

    def __init__(self) -> None:
        self._compressor: Any = None

    def get(self) -> Any:
        if self._compressor is not None:
            return self._compressor
        try:
            from llmlingua import PromptCompressor  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "llmlingua is not installed. Run: "
                "pip install -r requirements-llmlingua2.txt"
            ) from exc

        log.info(
            "Loading LLMLingua-2 model=%s on device=%s (first request only)",
            LLMLINGUA_MODEL,
            LLMLINGUA_DEVICE,
        )
        load_start = time.perf_counter()
        self._compressor = PromptCompressor(
            model_name=LLMLINGUA_MODEL,
            use_llmlingua2=True,
            device_map=LLMLINGUA_DEVICE,
        )
        log.info(
            "LLMLingua-2 ready in %.1fs",
            time.perf_counter() - load_start,
        )
        return self._compressor


COMPRESSOR = CompressorSingleton()


# ---------------------------------------------------------------------------
# Prompt-shape helpers (intentionally identical in spirit to proxy.ts)
# ---------------------------------------------------------------------------

ASSERT_LINE_RE = re.compile(r"^\s*assert\s+", re.IGNORECASE)


def split_asserts(raw: str) -> tuple[str, list[str]]:
    """Split a raw user prompt into (natural-language body, assert lines).

    OckBench prompts are uniformly ``<problem text>\n\nassert foo(...) == ...``.
    Compressing the assert block is unsafe: token-pruning a literal test would
    silently destroy the grader contract. We therefore detach asserts before
    compression and reattach them verbatim afterwards.
    """
    if not LLMLINGUA_PRESERVE_ASSERTS:
        return raw, []

    nl_lines: list[str] = []
    asserts: list[str] = []
    for line in raw.splitlines():
        if ASSERT_LINE_RE.match(line):
            asserts.append(line.rstrip())
        else:
            nl_lines.append(line)

    nl_body = "\n".join(nl_lines).strip()
    return nl_body, asserts


def approx_tokens(s: str) -> int:
    """Crude token estimate identical to the TS proxy's `approxTokens`.

    Used only for the 5% token-budget guard so behaviour is bit-for-bit
    comparable. The cloud-side usage counters return the real billed counts.
    """
    n = 0.0
    for ch in s:
        n += 0.25 if ord(ch) < 128 else 1.0
    return int(n + 0.999)


def compress_user_prompt(raw_user_text: str) -> CompressionResult:
    """Run LLMLingua-2 on the natural-language portion of a benchmark prompt.

    Returns a CompressionResult that already carries the 5%-budget decision:
    if compression did not buy at least 5% over the raw input (or failed), the
    raw prompt is returned and `used_compression=False`.
    """
    if not raw_user_text or not raw_user_text.strip():
        return CompressionResult(raw_user_text, 0, 0, 0.0, used_compression=False)

    nl_body, asserts = split_asserts(raw_user_text)
    if not nl_body:
        # Edge case: prompt is asserts-only; nothing to compress.
        return CompressionResult(
            raw_user_text,
            approx_tokens(raw_user_text),
            approx_tokens(raw_user_text),
            0.0,
            used_compression=False,
        )

    compressor = COMPRESSOR.get()
    compress_kwargs: dict[str, Any] = {
        "force_tokens": FORCE_TOKENS,
        "drop_consecutive": True,
    }
    if LLMLINGUA_TARGET_TOKEN > 0:
        compress_kwargs["target_token"] = LLMLINGUA_TARGET_TOKEN
    else:
        compress_kwargs["rate"] = LLMLINGUA_RATE

    t0 = time.perf_counter()
    try:
        result = compressor.compress_prompt(nl_body, **compress_kwargs)
    except Exception as exc:  # noqa: BLE001
        log.warning("LLMLingua-2 compression raised %s; forwarding raw.", exc)
        return CompressionResult(
            raw_user_text,
            approx_tokens(raw_user_text),
            approx_tokens(raw_user_text),
            (time.perf_counter() - t0) * 1000.0,
            used_compression=False,
        )
    latency_ms = (time.perf_counter() - t0) * 1000.0

    compressed_nl = (result.get("compressed_prompt") or "").strip()
    origin_tokens = int(result.get("origin_tokens") or 0)
    compressed_tokens = int(result.get("compressed_tokens") or 0)

    if not compressed_nl:
        log.warning("LLMLingua-2 returned empty output; forwarding raw.")
        return CompressionResult(
            raw_user_text,
            approx_tokens(raw_user_text),
            approx_tokens(raw_user_text),
            latency_ms,
            used_compression=False,
        )

    rebuilt = compressed_nl
    if asserts:
        rebuilt = f"{compressed_nl}\n\n" + "\n".join(asserts)

    raw_approx = approx_tokens(raw_user_text)
    rebuilt_approx = approx_tokens(rebuilt)
    if rebuilt_approx >= raw_approx * TOKEN_BUDGET_THRESHOLD:
        if DEBUG_PROMPT:
            log.info(
                "Token-budget guard fired: rebuilt=%d raw=%d (threshold=%.2f); forwarding raw.",
                rebuilt_approx,
                raw_approx,
                TOKEN_BUDGET_THRESHOLD,
            )
        return CompressionResult(
            raw_user_text,
            origin_tokens or raw_approx,
            rebuilt_approx,
            latency_ms,
            used_compression=False,
        )

    return CompressionResult(
        rebuilt,
        origin_tokens or raw_approx,
        compressed_tokens or rebuilt_approx,
        latency_ms,
        used_compression=True,
    )


# ---------------------------------------------------------------------------
# Cloud forwarding (mirrors routeToCloud in proxy.ts)
# ---------------------------------------------------------------------------

def get_last_user_message(messages: list[dict[str, Any]]) -> str:
    for msg in reversed(messages):
        if msg.get("role") == "user" and isinstance(msg.get("content"), str):
            return msg["content"]
    return ""


CODE_FENCE_RE = re.compile(r"```(?:python|py)?[ \t]*\r?\n([\s\S]*?)```", re.IGNORECASE)
SOLUTION_TAG_RE = re.compile(r"<\s*solution\s*>[\s\S]*?<\s*/\s*solution\s*>", re.IGNORECASE)
PY_HEAD_RE = re.compile(r"^\s*(?:def |from |import |class )", re.MULTILINE)


def normalize_code_response(content: str) -> str:
    """Re-wrap fenced code or top-level Python source into <solution> tags.

    OckBench's code extractor only looks for <solution> tags; some providers
    (notably Gemini) emit ```python fences with prose around them. Without this
    rewrite their code is unrecoverable by the grader.
    """
    if not content:
        return content
    if SOLUTION_TAG_RE.search(content):
        return content
    fence = CODE_FENCE_RE.search(content)
    if fence and fence.group(1).strip():
        return f"<solution>\n{fence.group(1).strip()}\n</solution>"
    if PY_HEAD_RE.search(content):
        return f"<solution>\n{content.strip()}\n</solution>"
    return content


def normalize_openai_response(parsed: dict[str, Any]) -> dict[str, Any]:
    choices = parsed.get("choices")
    if not isinstance(choices, list):
        return parsed
    for choice in choices:
        msg = choice.get("message") if isinstance(choice, dict) else None
        if isinstance(msg, dict) and isinstance(msg.get("content"), str):
            msg["content"] = normalize_code_response(msg["content"])
    return parsed


def forward_to_cloud(
    original_body: dict[str, Any], optimized_user_prompt: str
) -> dict[str, Any]:
    if not CLOUD_API_KEY:
        raise RuntimeError("Missing CLOUD_API_KEY in environment.")

    original_messages = original_body.get("messages") or []
    non_system = [m for m in original_messages if m.get("role") != "system"]
    rewritten = [
        ({**m, "content": optimized_user_prompt} if m.get("role") == "user" else m)
        for m in non_system
    ]
    messages_with_system: list[dict[str, Any]] = [
        {"role": "system", "content": REQUIRED_SYSTEM_TEXT},
    ]
    if rewritten:
        messages_with_system.extend(rewritten)
    else:
        messages_with_system.append({"role": "user", "content": optimized_user_prompt})

    if CLOUD_PROVIDER == "anthropic":
        system_text = "\n".join(
            m["content"] for m in messages_with_system if m.get("role") == "system"
        ).strip()
        anthropic_messages = [
            {
                "role": "assistant" if m.get("role") == "assistant" else "user",
                "content": m.get("content", ""),
            }
            for m in messages_with_system
            if m.get("role") != "system"
        ]
        anthropic_payload = {
            "model": original_body.get("model") or CLOUD_MODEL,
            "system": system_text or None,
            "messages": anthropic_messages,
            "max_tokens": int(original_body.get("max_tokens", 2000)),
            "temperature": float(original_body.get("temperature", 0.2)),
        }
        resp = requests.post(
            f"{CLOUD_BASE_URL}/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": CLOUD_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            data=json.dumps(anthropic_payload),
            timeout=120,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Anthropic API failed ({resp.status_code}): {resp.text}")
        anthropic = resp.json()
        raw_text = "\n".join(
            c.get("text", "")
            for c in (anthropic.get("content") or [])
            if c.get("type") == "text" and isinstance(c.get("text"), str)
        )
        content_text = normalize_code_response(raw_text)
        usage = anthropic.get("usage") or {}
        return {
            "id": anthropic.get("id") or f"chatcmpl-{int(time.time())}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": anthropic.get("model") or CLOUD_MODEL,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": content_text},
                    "finish_reason": anthropic.get("stop_reason") or "stop",
                }
            ],
            "usage": {
                "prompt_tokens": usage.get("input_tokens", 0),
                "completion_tokens": usage.get("output_tokens", 0),
                "total_tokens": usage.get("input_tokens", 0)
                + usage.get("output_tokens", 0),
            },
        }

    openai_payload = {
        **original_body,
        "model": original_body.get("model") or CLOUD_MODEL,
        "messages": messages_with_system,
    }
    resp = requests.post(
        f"{CLOUD_BASE_URL}/v1/chat/completions",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {CLOUD_API_KEY}",
        },
        data=json.dumps(openai_payload),
        timeout=120,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"OpenAI-compatible API failed ({resp.status_code}): {resp.text}")
    return normalize_openai_response(resp.json())


# ---------------------------------------------------------------------------
# Flask app
# ---------------------------------------------------------------------------

app = Flask(__name__)


@app.get("/health")
def health() -> Any:
    return jsonify(
        {
            "ok": True,
            "service": "llmlingua2-proxy",
            "model": LLMLINGUA_MODEL,
            "rate": LLMLINGUA_RATE,
            "target_token": LLMLINGUA_TARGET_TOKEN or None,
            "preserve_asserts": LLMLINGUA_PRESERVE_ASSERTS,
            "cloud_provider": CLOUD_PROVIDER,
            "cloud_model": CLOUD_MODEL,
        }
    )


@app.post("/v1/chat/completions")
def chat_completions() -> Any:
    try:
        body = request.get_json(force=True, silent=False) or {}
    except Exception as exc:  # noqa: BLE001
        return (
            jsonify(
                {
                    "error": {
                        "message": f"Failed to parse JSON body: {exc}",
                        "type": "invalid_request_error",
                    }
                }
            ),
            400,
        )

    raw_user_text = get_last_user_message(body.get("messages") or [])
    if not raw_user_text:
        return (
            jsonify(
                {
                    "error": {
                        "message": "No user message found in request.messages",
                        "type": "invalid_request_error",
                    }
                }
            ),
            400,
        )

    try:
        result = compress_user_prompt(raw_user_text)
    except Exception as exc:  # noqa: BLE001
        log.exception("Compression failure")
        return (
            jsonify(
                {
                    "error": {"message": str(exc), "type": "proxy_error"},
                }
            ),
            500,
        )

    if DEBUG_PROMPT:
        log.info(
            "compress: origin=%d compressed=%d used=%s latency=%.1fms",
            result.origin_tokens,
            result.compressed_tokens,
            result.used_compression,
            result.latency_ms,
        )
        log.info("=== RAW USER PROMPT ===\n%s", raw_user_text)
        log.info("=== OPTIMIZED PROMPT ===\n%s", result.compressed_prompt)

    try:
        cloud_response = forward_to_cloud(body, result.compressed_prompt)
    except Exception as exc:  # noqa: BLE001
        log.exception("Cloud routing failure")
        return (
            jsonify(
                {
                    "error": {"message": str(exc), "type": "proxy_error"},
                }
            ),
            500,
        )

    # Surface our own per-request stats in a non-breaking extra field so an
    # OpenAI-compatible consumer just ignores it but our analysis scripts can
    # read it back out of the logs / response.
    if isinstance(cloud_response, dict):
        cloud_response.setdefault("x_llmlingua2", {})
        cloud_response["x_llmlingua2"].update(
            {
                "used_compression": result.used_compression,
                "origin_tokens": result.origin_tokens,
                "compressed_tokens": result.compressed_tokens,
                "compression_latency_ms": round(result.latency_ms, 2),
                "rate": LLMLINGUA_RATE,
                "target_token": LLMLINGUA_TARGET_TOKEN or None,
            }
        )
    return jsonify(cloud_response)


# ---------------------------------------------------------------------------
# Offline batch mode (for sanity-checking before running OckBench)
# ---------------------------------------------------------------------------

def offline_compress_file(jsonl_path: str, out_path: str) -> None:
    """Compress every `problem` field in a JSONL file and write a new JSONL
    with `compressed_problem`, `origin_tokens`, `compressed_tokens` added.

    This is the path you use to eyeball whether LLMLingua-2 is destroying
    edge-case clauses on the OMH-Polyglot inputs before paying for cloud
    inference. It does NOT call any cloud API.
    """
    n_rows = 0
    n_kept = 0
    total_origin = 0
    total_compressed = 0
    with open(jsonl_path, "r", encoding="utf-8") as fh_in, open(
        out_path, "w", encoding="utf-8"
    ) as fh_out:
        for line in fh_in:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            raw_text = row.get("problem") or ""
            # In offline mode we want to mirror what the proxy does to a real
            # request: include the asserts so split_asserts has something to
            # detach. OckBench appends asserts to `problem` when constructing
            # the chat message, so we do the same here.
            asserts = (row.get("metadata") or {}).get("test_list") or []
            full_user = raw_text
            if asserts:
                full_user = f"{raw_text}\n\n" + "\n".join(asserts)
            result = compress_user_prompt(full_user)
            n_rows += 1
            if result.used_compression:
                n_kept += 1
            total_origin += result.origin_tokens
            total_compressed += result.compressed_tokens
            row["compressed_problem"] = result.compressed_prompt
            row["origin_tokens"] = result.origin_tokens
            row["compressed_tokens"] = result.compressed_tokens
            row["used_compression"] = result.used_compression
            row["compression_latency_ms"] = round(result.latency_ms, 2)
            fh_out.write(json.dumps(row, ensure_ascii=False) + "\n")

    log.info(
        "Offline batch done: rows=%d compressed=%d skipped=%d origin_total=%d compressed_total=%d ratio=%.3f",
        n_rows,
        n_kept,
        n_rows - n_kept,
        total_origin,
        total_compressed,
        (total_compressed / total_origin) if total_origin else 0.0,
    )


def _cli_offline() -> int:
    import argparse

    p = argparse.ArgumentParser(
        prog="llmlingua2_proxy.py --offline",
        description="Compress every prompt in a JSONL file without dispatching to the cloud.",
    )
    p.add_argument("--offline", action="store_true", help="Required for batch mode.")
    p.add_argument("--in", dest="in_path", required=True, help="Input JSONL path.")
    p.add_argument("--out", dest="out_path", required=True, help="Output JSONL path.")
    args = p.parse_args()
    offline_compress_file(args.in_path, args.out_path)
    return 0


def main() -> None:
    if "--offline" in sys.argv:
        sys.exit(_cli_offline())
    log.info(
        "llmlingua2-proxy starting on http://localhost:%d  "
        "[model=%s, rate=%.2f, target_token=%s, device=%s, "
        "preserve_asserts=%s, cloud=%s/%s]",
        PORT,
        LLMLINGUA_MODEL,
        LLMLINGUA_RATE,
        LLMLINGUA_TARGET_TOKEN or "-",
        LLMLINGUA_DEVICE,
        LLMLINGUA_PRESERVE_ASSERTS,
        CLOUD_PROVIDER,
        CLOUD_MODEL,
    )
    app.run(host="0.0.0.0", port=PORT, threaded=True)


if __name__ == "__main__":
    main()
