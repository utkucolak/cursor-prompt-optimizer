# Benchmark Proxy

OpenAI-compatible proxy server for benchmark testing:

1. Receives `POST /v1/chat/completions`
2. Optimizes the latest user prompt using local Ollama (`llama3.2`)
3. Routes optimized request to a cloud OpenAI-compatible API (e.g. GPT-4o)
4. Returns the cloud response in standard OpenAI JSON format

## Setup

1. Copy `.env.example` to `.env` and fill in `CLOUD_API_KEY`.
2. Install dependencies:
   - `npm install`
3. Run:
   - `npm run dev`

Default URL: `http://localhost:4000/v1/chat/completions`

## Debugging Optimized Prompt

If you want to inspect what Ollama produces before cloud routing:

1. Set in `.env`:
   - `DEBUG_PROMPT=true`
2. Restart proxy:
   - `npm run dev`

Each request will print:
- `=== RAW USER PROMPT ===`
- `=== OPTIMIZED PROMPT ===`

## Cloud Provider Options

The proxy always exposes `POST /v1/chat/completions` to your benchmark.
Internally, you can route to:

- `CLOUD_PROVIDER=openai` (default): calls `${CLOUD_BASE_URL}/v1/chat/completions`
- `CLOUD_PROVIDER=anthropic`: calls `${CLOUD_BASE_URL}/v1/messages` and converts the response back to OpenAI chat-completions JSON.

### Example (OpenAI GPT-4o)

```env
CLOUD_PROVIDER=openai
CLOUD_BASE_URL=https://api.openai.com
CLOUD_MODEL=gpt-4o
CLOUD_API_KEY=...
```

### Example (Anthropic Claude)

```env
CLOUD_PROVIDER=anthropic
CLOUD_BASE_URL=https://api.anthropic.com
CLOUD_MODEL=claude-3-5-sonnet-latest
CLOUD_API_KEY=...
```

## LLMLingua-2 Baseline Proxy (`llmlingua2_proxy.py`)

A second, drop-in OpenAI-compatible proxy that replaces the Ollama/Llama-3.2
rewrite stage with Microsoft's **LLMLingua-2** token-classification compressor.
It exists to support the head-to-head baseline cell discussed in the paper's
Section 5 follow-up: same request/response shape as `proxy.ts`, same
`<solution>` re-wrap, same 5% token-budget guard — only the compression
mechanism changes.

### Setup

```bash
# 1. Install Python deps (CPU is fine; GPU is faster):
python -m pip install -r requirements-llmlingua2.txt

# 2. Reuse the same .env as the TS proxy and run on a different port:
PORT=4001 LLMLINGUA_RATE=0.6 python llmlingua2_proxy.py
```

Then point your OckBench OpenAI-compatible base URL at `http://localhost:4001`
instead of `http://localhost:4000`.

### Key flags

| Variable                     | Default                                                 | Notes |
| ---------------------------- | ------------------------------------------------------- | ----- |
| `PORT`                       | `4001`                                                  | Different from the TS proxy so both can run side-by-side. |
| `LLMLINGUA_MODEL`            | `microsoft/llmlingua-2-xlm-roberta-large-meetingbank`   | Official multilingual checkpoint. |
| `LLMLINGUA_RATE`             | `0.6`                                                   | Fraction of tokens to **keep** (0.6 ≈ 40% reduction). |
| `LLMLINGUA_TARGET_TOKEN`     | `0`                                                     | If >0, target absolute token count instead of a rate. |
| `LLMLINGUA_DEVICE`           | `cpu`                                                   | Set `cuda` / `mps` if available. |
| `LLMLINGUA_PRESERVE_ASSERTS` | `true`                                                  | Splits `assert ...` lines off the prompt, compresses only the natural-language body, then reattaches asserts verbatim. **Leave on for code benchmarks.** |
| `TOKEN_BUDGET_THRESHOLD`     | `0.95`                                                  | If the compressed payload is ≥ 95 % of the raw payload, the raw prompt is forwarded (matches the TS proxy's 5 % guard). |

### Why preserve asserts

LLMLingua-2 is a task-agnostic token classifier; it does not know that
`assert foo(1) == 2` is an executable contract rather than a sentence. Without
`LLMLINGUA_PRESERVE_ASSERTS=true`, the compressor can drop tokens inside an
assert and silently corrupt the grader. Keeping the asserts verbatim is the
only fair design for an OckBench-style code benchmark and matches what the
TypeScript proxy does in its Bi-Block construction.

### Offline batch mode

For sanity-checking what LLMLingua-2 does to a JSONL file **without paying for
cloud inference**:

```bash
python llmlingua2_proxy.py --offline \
  --in  ../data/OckBench_coding_polyglot_hard_200.jsonl \
  --out ../data/OckBench_coding_polyglot_hard_200.llmlingua2.jsonl
```

Each output row gains `compressed_problem`, `origin_tokens`,
`compressed_tokens`, `used_compression`, and `compression_latency_ms` fields,
which lets you eyeball whether the compressor is silently destroying
edge-case clauses on the Turkish / Arabic / Chinese inputs before committing
real API spend.

### Extra response field

The proxy attaches a non-breaking `x_llmlingua2` field to every successful
chat completion containing per-request token counts and compression latency.
Clients that only parse the standard OpenAI fields ignore it; analysis
scripts can read it back directly without re-tokenising.
