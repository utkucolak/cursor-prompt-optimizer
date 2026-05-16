import express from "express";
import dotenv from "dotenv";

dotenv.config();

type ChatRole = "system" | "user" | "assistant" | "tool";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatCompletionsRequest {
  model?: string;
  messages?: ChatMessage[];
  [key: string]: unknown;
}

const PORT = Number(process.env.PORT || 4000);
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || "llama3.2").trim();
const CLOUD_BASE_URL = (process.env.CLOUD_BASE_URL || "https://api.openai.com").replace(/\/$/, "");
const CLOUD_API_KEY = process.env.CLOUD_API_KEY || "";
const CLOUD_MODEL = process.env.CLOUD_MODEL || "gpt-4o";
const CLOUD_PROVIDER = (process.env.CLOUD_PROVIDER || "openai").toLowerCase();
const DEBUG_PROMPT = (process.env.DEBUG_PROMPT || "false").toLowerCase() === "true";
const REQUIRED_SYSTEM_TEXT =
  "Expert Python developer. Write clean, maintainable code; one focused change at a time.";

const CONTEXT_LINE = "Python coding task; tests are authoritative.";

type ProxyMode = "full" | "names_only" | "regex_strip" | "llm_no_names";
const VALID_MODES: ProxyMode[] = ["full", "names_only", "regex_strip", "llm_no_names"];
const RAW_MODE = (process.env.PROXY_MODE || "full").toLowerCase();
const PROXY_MODE: ProxyMode = (VALID_MODES as string[]).includes(RAW_MODE)
  ? (RAW_MODE as ProxyMode)
  : "full";
if (RAW_MODE !== PROXY_MODE) {
  // eslint-disable-next-line no-console
  console.warn(
    `[benchmark-proxy] Unknown PROXY_MODE='${RAW_MODE}', falling back to 'full'. Valid: ${VALID_MODES.join(", ")}.`
  );
}

const app = express();
app.use(express.json({ limit: "4mb" }));

function getLastUserMessage(messages: ChatMessage[] = []): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user" && typeof messages[i].content === "string") {
      return messages[i].content;
    }
  }
  return "";
}

function buildOptimizationPrompt(raw: string, useNames: boolean): string {
  const lines: string[] = [
    "You are a token-efficient prompt rewriter for Python coding benchmark problems.",
    "",
    "GOAL: produce ONE compact ENGLISH instruction (1–2 short sentences) saying what to implement.",
    "Translating non-English problem text into English is REQUIRED — English tokenizes cheaper than Arabic / Turkish / Chinese / etc.",
    "",
    "RULES:",
    "1. Translate the problem to concise English.",
    "2. STRIP all daily slang, pleasantries, filler (e.g. \"please\", \"thanks\", \"abi\", \"ya\", \"kolay gelsin\", \"can you\", \"easy come\", \"rica etsem\", \"bak bi baksana\", \"is ciksin bitsin\")."
  ];

  if (useNames) {
    lines.push("3. Mention every required function name VERBATIM (case-sensitive).");
    lines.push("4. For obscure technical / math terms (e.g. \"Eulerian numbers\", \"Woodall numbers\"), KEEP the term as-is and refer to the asserts; do NOT invent a definition.");
    lines.push("5. Do NOT include code, <solution> tags, asserts, headers, or section labels. Just the instruction text.");
    lines.push("6. Maximum ~40 words. Shorter is better.");
  } else {
    lines.push("3. For obscure technical / math terms (e.g. \"Eulerian numbers\", \"Woodall numbers\"), KEEP the term as-is and refer to the asserts; do NOT invent a definition.");
    lines.push("4. Do NOT include code, <solution> tags, asserts, headers, or section labels. Just the instruction text.");
    lines.push("5. Maximum ~40 words. Shorter is better.");
  }

  lines.push("");

  if (useNames) {
    const funcNames = functionNamesFromAsserts(raw);
    const fnHint =
      funcNames.length > 0
        ? `Function names required by the asserts (mention each verbatim): ${funcNames.join(", ")}.`
        : "No explicit function name detected in asserts.";
    lines.push(fnHint);
    lines.push("");
  }

  lines.push(
    "Examples (do not echo):",
    "  Input (Turkish chatty): \"Tam sayılardan oluşan dizide ilk tekrar eden elemanı bulan fonksiyon lazım, kolay gelsin.\"",
    "  Output: Implement find_first_duplicate(nums) returning the first integer that repeats in the list, or -1 if none.",
    "",
    "  Input (Arabic): \"عدد أويلري Eulerian a(n,m)، دالة ترجع الناتج حسب التعريف.\"",
    "  Output: Implement eulerian_num(n, m) returning the Eulerian number A(n, m); behavior is fixed by the asserts.",
    "",
    "----- USER MESSAGE -----",
    raw,
    "",
    "Now write the single compact English instruction (no headers, no code):"
  );

  return lines.join("\n");
}

async function optimizeWithOllama(rawUserText: string, useNames: boolean): Promise<string> {
  const response = await callOllama(buildOptimizationPrompt(rawUserText, useNames));

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama optimization failed (${response.status}): ${err}`);
  }

  const body = (await response.json()) as { response?: string };
  const optimized = (body.response || "").trim();
  if (!optimized) {
    throw new Error("Ollama returned an empty optimized prompt.");
  }
  let candidate = optimized;
  let currentValidation = validateLight(rawUserText, candidate, useNames);
  for (let attempt = 0; attempt < 2 && !currentValidation.valid; attempt++) {
    const repairTaskHint = useNames
      ? "<one short English sentence; mention every required function name verbatim; do not invent definitions; no code>"
      : "<one short English sentence; do not invent definitions; no code>";
    const repairPrompt = [
      buildOptimizationPrompt(rawUserText, useNames),
      "",
      "Your previous output was invalid. Regenerate ONLY a [TASK] block.",
      "Violations:",
      ...currentValidation.reasons.map((reason, index) => `${index + 1}. ${reason}`),
      "",
      "Previous invalid output:",
      candidate,
      "",
      "Output ONLY:",
      "[TASK]",
      repairTaskHint
    ].join("\n");
    const repairResponse = await callOllama(repairPrompt);
    if (!repairResponse.ok) {
      const repairErr = await repairResponse.text();
      throw new Error(`Ollama repair pass failed (${repairResponse.status}): ${repairErr}`);
    }
    const repairBody = (await repairResponse.json()) as { response?: string };
    if (!repairBody.response) {
      throw new Error("Invalid response format from Ollama repair pass.");
    }
    candidate = repairBody.response.trim();
    currentValidation = validateLight(rawUserText, candidate, useNames);
  }

  if (!currentValidation.valid || !currentValidation.finalized) {
    if (DEBUG_PROMPT) {
      // eslint-disable-next-line no-console
      console.warn(
        "[benchmark-proxy] Ollama output failed validation; sending original user message to cloud. Violations:",
        currentValidation.reasons.join(" | ")
      );
    }
    return rawUserText;
  }

  const optimizedTokens = approxTokens(currentValidation.finalized);
  const rawTokens = approxTokens(rawUserText);
  if (optimizedTokens >= rawTokens * 0.95) {
    if (DEBUG_PROMPT) {
      // eslint-disable-next-line no-console
      console.warn(
        `[benchmark-proxy] No token win (${optimizedTokens} vs raw ${rawTokens}); sending raw.`
      );
    }
    return rawUserText;
  }
  return currentValidation.finalized;
}

async function callOllama(prompt: string): Promise<Response> {
  return fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0,
        top_p: 0.9,
        num_predict: 200,
        stop: [
          "\nassert ",
          "[CONTEXT]",
          "[CONSTRAINTS]",
          "[SYSTEM]",
          "[TASK]",
          "[ORIGINAL PROBLEM]",
          "----- USER MESSAGE -----",
          "<solution>",
          "```",
          "Output:"
        ]
      }
    })
  });
}

function cleanModelInstruction(text: string): string {
  let t = text.trim();
  t = t.replace(/^\s*\[?\s*TASK\s*\]?\s*:?\s*/i, "");
  t = t.replace(/^\s*Output\s*:?\s*/i, "");
  t = t.replace(/```[\s\S]*?```/g, "").trim();
  t = t.replace(/<\/?solution>/gi, "").trim();
  t = t.replace(/\n\s*assert[\s\S]*$/i, "").trim();
  t = t.replace(/\n\s*Tests?:[\s\S]*$/i, "").trim();
  t = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join(" ");
  return t.trim();
}

function extractAsserts(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("assert "));
}

function functionNamesFromAsserts(raw: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("assert ")) continue;
    const m = t.match(/assert\s+([A-Za-z_]\w*)\s*\(/);
    if (m && !seen.has(m[1])) {
      seen.add(m[1]);
      names.push(m[1]);
    }
  }
  return names;
}

const MAX_TASK_LEN = 400;

/** Crude token estimate. Non-ASCII ~1 token/char, ASCII ~0.25 token/char. */
function approxTokens(s: string): number {
  let n = 0;
  for (const ch of s) n += /[\x00-\x7F]/.test(ch) ? 0.25 : 1;
  return Math.ceil(n);
}

function finalizeOptimizedPrompt(
  rawUserText: string,
  modelResponse: string,
  useNames: boolean
): string | null {
  const names = useNames ? functionNamesFromAsserts(rawUserText) : [];
  const asserts = extractAsserts(rawUserText);

  let instruction = cleanModelInstruction(modelResponse);
  if (!instruction || instruction.length < 8) {
    if (!useNames || names.length === 0) return null;
    instruction = `Implement ${names.join(", ")} so the asserts below pass.`;
  }
  if (useNames && names.length > 0 && !names.some((n) => instruction.includes(n))) {
    instruction = `Implement ${names.join(", ")}: ${instruction}`;
  }
  if (instruction.length > MAX_TASK_LEN) {
    instruction = instruction.slice(0, MAX_TASK_LEN).trim() + "…";
  }

  const taskBlock = [instruction, ...asserts].join("\n");

  return [
    `[CONTEXT]\n${CONTEXT_LINE}`,
    `[TASK]\n${taskBlock}`
  ].join("\n\n");
}

function validateLight(
  rawPrompt: string,
  modelResponse: string,
  useNames: boolean
): { valid: boolean; reasons: string[]; finalized: string | null } {
  const reasons: string[] = [];
  const finalized = finalizeOptimizedPrompt(rawPrompt, modelResponse, useNames);

  if (!finalized) {
    reasons.push("Empty model output (and no function-name fallback available).");
    return { valid: false, reasons, finalized: null };
  }

  if (/```\s*\w*[\s\S]*?\bdef\s+\w+\s*\(/m.test(modelResponse)) {
    reasons.push("Model output contains a Python/code block.");
  }
  if (/<\s*solution\s*>[\s\S]*<\s*\/\s*solution\s*>/i.test(modelResponse)) {
    reasons.push("Model output contains a filled <solution>...</solution> block.");
  }

  return { valid: reasons.length === 0, reasons, finalized };
}

/**
 * names_only ablation arm: NO LLM call. Take the raw multilingual prompt and
 * deterministically prepend the function-name oracle. This isolates the
 * accuracy contribution of identifier salience alone, with zero rewriting.
 */
function namesOnlyTransform(rawUserText: string): string {
  const names = functionNamesFromAsserts(rawUserText);
  if (names.length === 0) return rawUserText;
  const prefix = `Implement ${names.join(", ")} so the asserts below pass.`;
  return `${prefix}\n\n${rawUserText}`;
}

/**
 * regex_strip ablation arm: NO LLM call. Apply a deterministic regex pass that
 * strips multilingual pleasantries / filler tokens. This bounds what a
 * non-LLM cleanup can buy us on token cost and accuracy.
 */
const SLOP_PATTERNS: RegExp[] = [
  /\b(?:please|pls|kindly|thanks|thank you|cheers)\b/gi,
  /\b(?:could you|can you|would you|i need you to|i want you to)\b/gi,
  /\bkolay gelsin\b/gi,
  /\brica etsem\b/gi,
  /\bbak (?:bi(?:r)? )?baksana\b/gi,
  /\b(?:abi|abicim|kanka|usta|ya|hocam)\b/gi,
  /\bis ciksin bitsin\b/gi,
  /\beasy come\b/gi,
  /من\s+فضلك/g,
  /\bرجاء\b/g,
  /\bرجاءً\b/g,
  /\bأرجوك\b/g,
  /شكرا(?:ً)?/g,
  /لو\s+سمحت/g,
  /请\s*帮\s*我/g,
  /麻烦\s*你/g,
  /谢谢/g,
  /拜托/g
];

function regexStripTransform(rawUserText: string): string {
  let cleaned = rawUserText;
  for (const p of SLOP_PATTERNS) cleaned = cleaned.replace(p, "");
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/^[ \t]+/gm, "");
  return cleaned.trim();
}

async function dispatchOptimization(rawUserText: string, mode: ProxyMode): Promise<string> {
  switch (mode) {
    case "full":
      return optimizeWithOllama(rawUserText, true);
    case "llm_no_names":
      return optimizeWithOllama(rawUserText, false);
    case "names_only":
      return namesOnlyTransform(rawUserText);
    case "regex_strip":
      return regexStripTransform(rawUserText);
  }
}

/**
 * Normalize an LLM coding response so OckBench can extract code reliably.
 *
 * Some providers (notably Gemini) ignore <solution>...</solution> directives and
 * wrap code in ```python ... ``` fences with prose before/after. OckBench's code
 * extractor only looks for <solution> tags, so we re-wrap here.
 */
function normalizeCodeResponse(content: string): string {
  if (!content) return content;

  if (/<\s*solution\s*>[\s\S]*?<\s*\/\s*solution\s*>/i.test(content)) {
    return content;
  }

  const fenceMatch = content.match(/```(?:python|py)?[ \t]*\r?\n([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1] && fenceMatch[1].trim()) {
    return `<solution>\n${fenceMatch[1].trim()}\n</solution>`;
  }

  if (/^\s*(?:def |from |import |class )/m.test(content)) {
    return `<solution>\n${content.trim()}\n</solution>`;
  }

  return content;
}

interface OpenAIChoice {
  index?: number;
  message?: { role?: string; content?: string };
  finish_reason?: string;
  [key: string]: unknown;
}

interface OpenAIChatCompletion {
  choices?: OpenAIChoice[];
  [key: string]: unknown;
}

function normalizeOpenAIResponse(parsed: OpenAIChatCompletion): OpenAIChatCompletion {
  if (!parsed || !Array.isArray(parsed.choices)) return parsed;
  parsed.choices = parsed.choices.map((choice) => {
    const content = choice?.message?.content;
    if (typeof content === "string") {
      return {
        ...choice,
        message: {
          ...choice.message,
          content: normalizeCodeResponse(content)
        }
      };
    }
    return choice;
  });
  return parsed;
}

async function routeToCloud(
  originalRequest: ChatCompletionsRequest,
  optimizedUserPrompt: string
): Promise<unknown> {
  if (!CLOUD_API_KEY) {
    throw new Error("Missing CLOUD_API_KEY.");
  }

  const originalMessages = Array.isArray(originalRequest.messages) ? originalRequest.messages : [];
  const nonSystemMessages = originalMessages.filter((msg) => msg.role !== "system");
  const rewrittenMessages = nonSystemMessages.map((msg) =>
    msg.role === "user" ? { ...msg, content: optimizedUserPrompt } : msg
  );

  const messagesWithSystem: ChatMessage[] = [
    { role: "system", content: REQUIRED_SYSTEM_TEXT },
    ...(rewrittenMessages.length > 0
      ? rewrittenMessages
      : [{ role: "user" as const, content: optimizedUserPrompt }])
  ];

  const safeMessages = messagesWithSystem;

  if (CLOUD_PROVIDER === "anthropic") {
    const systemText = safeMessages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n")
      .trim();

    const anthropicMessages = safeMessages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));

    const anthropicPayload = {
      model: (originalRequest.model as string) || CLOUD_MODEL,
      system: systemText || undefined,
      messages: anthropicMessages,
      max_tokens: Number(originalRequest.max_tokens ?? 2000),
      temperature:
        typeof originalRequest.temperature === "number"
          ? originalRequest.temperature
          : 0.2
    };

    const response = await fetch(`${CLOUD_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLOUD_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(anthropicPayload)
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Anthropic API failed (${response.status}): ${text}`);
    }

    const anthropic = JSON.parse(text) as {
      id: string;
      model: string;
      content?: Array<{ type: string; text?: string }>;
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const rawContentText = (anthropic.content || [])
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text)
      .join("\n");
    const contentText = normalizeCodeResponse(rawContentText);

    // Return OpenAI-compatible shape to benchmark callers.
    return {
      id: anthropic.id || `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: anthropic.model || CLOUD_MODEL,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: contentText
          },
          finish_reason: anthropic.stop_reason || "stop"
        }
      ],
      usage: {
        prompt_tokens: anthropic.usage?.input_tokens ?? 0,
        completion_tokens: anthropic.usage?.output_tokens ?? 0,
        total_tokens:
          (anthropic.usage?.input_tokens ?? 0) +
          (anthropic.usage?.output_tokens ?? 0)
      }
    };
  }

  const openAiPayload: ChatCompletionsRequest = {
    ...originalRequest,
    model: (originalRequest.model as string) || CLOUD_MODEL,
    messages: safeMessages
  };

  const response = await fetch(`${CLOUD_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CLOUD_API_KEY}`
    },
    body: JSON.stringify(openAiPayload)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI-compatible API failed (${response.status}): ${text}`);
  }
  return normalizeOpenAIResponse(JSON.parse(text) as OpenAIChatCompletion);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "benchmark-proxy" });
});

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const requestBody = (req.body || {}) as ChatCompletionsRequest;
    const rawUserText = getLastUserMessage(requestBody.messages || []);

    if (!rawUserText) {
      return res.status(400).json({
        error: {
          message: "No user message found in request.messages",
          type: "invalid_request_error"
        }
      });
    }

    const optimizedPrompt = await dispatchOptimization(rawUserText, PROXY_MODE);
    if (DEBUG_PROMPT) {
      // Intentionally verbose for benchmark debugging.
      console.log(`\n=== MODE: ${PROXY_MODE} ===`);
      console.log("\n=== RAW USER PROMPT ===\n");
      console.log(rawUserText);
      console.log("\n=== OPTIMIZED PROMPT ===\n");
      console.log(optimizedPrompt);
      console.log("\n=======================\n");
    }
    const cloudResponse = await routeToCloud(requestBody, optimizedPrompt);

    // Return unchanged OpenAI-compatible response body from cloud provider.
    return res.status(200).json(cloudResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: {
        message,
        type: "proxy_error"
      }
    });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `benchmark-proxy listening on http://localhost:${PORT} [mode=${PROXY_MODE}, cloud=${CLOUD_PROVIDER}/${CLOUD_MODEL}]`
  );
});
