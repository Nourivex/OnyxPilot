/**
 * Pembentuk + pengurai payload protokol AI — MURNI, tanpa `vscode`.
 * Kelas provider (ollama.ts / openai-compatible.ts) tinggal pakai ini
 * dengan endpoint/model yang dibaca dari Settings.
 */
import type { AIRequest, AIResponse } from "./provider";

// --- Ollama /api/generate (non-streaming) ---

export interface OllamaOptions {
  temperature?: number;
  num_predict?: number;
}

export interface OllamaPayload {
  model: string;
  system: string;
  prompt: string;
  stream: false;
  /** false = matikan mode think (jawaban langsung, hemat token). */
  think?: boolean;
  options?: OllamaOptions;
}

export interface OllamaGenOptions {
  think?: boolean;
  temperature?: number;
  numPredict?: number;
}

export function buildOllamaPayload(
  model: string,
  req: AIRequest,
  opts: OllamaGenOptions = {}
): OllamaPayload {
  const payload: OllamaPayload = {
    model,
    system: req.system,
    prompt: req.user,
    stream: false
  };
  if (opts.think !== undefined) {
    payload.think = opts.think;
  }
  const options: OllamaOptions = {};
  if (opts.temperature !== undefined && Number.isFinite(opts.temperature)) {
    options.temperature = opts.temperature;
  }
  if (
    opts.numPredict !== undefined &&
    Number.isFinite(opts.numPredict) &&
    opts.numPredict > 0
  ) {
    options.num_predict = Math.floor(opts.numPredict);
  }
  if (Object.keys(options).length > 0) {
    payload.options = options;
  }
  return payload;
}

export function parseOllamaResult(json: unknown, fallbackModel: string): AIResponse {
  const obj = (json ?? {}) as {
    response?: unknown;
    model?: unknown;
    error?: unknown;
  };
  if (typeof obj.error === "string" && obj.error.length > 0) {
    throw new Error(`Ollama: ${obj.error}`);
  }
  if (typeof obj.response !== "string" || obj.response.length === 0) {
    throw new Error("Ollama mengembalikan respons kosong.");
  }
  return {
    text: obj.response,
    model: typeof obj.model === "string" ? obj.model : fallbackModel
  };
}

// --- OpenAI-compatible /chat/completions (non-streaming) ---

export interface ChatPayload {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  stream: false;
}

export function buildChatPayload(model: string, req: AIRequest): ChatPayload {
  return {
    model,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user }
    ],
    stream: false
  };
}

export function parseChatResult(json: unknown, fallbackModel: string): AIResponse {
  const obj = (json ?? {}) as {
    choices?: unknown;
    model?: unknown;
    error?: unknown;
  };
  if (obj.error !== undefined) {
    const msg =
      typeof obj.error === "object" && obj.error !== null && "message" in obj.error
        ? String((obj.error as { message: unknown }).message)
        : JSON.stringify(obj.error).slice(0, 300);
    throw new Error(`API: ${msg}`);
  }
  const msg: Record<string, unknown> =
    Array.isArray(obj.choices) &&
    typeof (obj.choices[0] as { message?: unknown } | undefined)?.message ===
      "object" &&
    (obj.choices[0] as { message?: unknown }).message !== null
      ? ((obj.choices[0] as { message: Record<string, unknown> }).message)
      : {};
  const content =
    typeof msg.content === "string" && msg.content.length > 0
      ? msg.content
      : typeof msg.reasoning_content === "string"
        ? msg.reasoning_content
        : "";
  if (content.length === 0) {
    throw new Error("API mengembalikan respons kosong.");
  }
  return {
    text: content,
    model: typeof obj.model === "string" ? obj.model : fallbackModel
  };
}

/** Daftar model gaya OpenAI: `{ data: [{ id }] }` (dipakai /models). */
export function parseOpenAIModels(json: unknown): string[] {
  const obj = (json ?? {}) as { data?: unknown };
  if (!Array.isArray(obj.data)) {
    return [];
  }
  const ids = obj.data
    .map((m) => {
      const item = (m ?? {}) as { id?: unknown };
      return typeof item.id === "string" ? item.id : "";
    })
    .filter((s) => s.length > 0);
  return [...new Set(ids)].sort();
}
