/** Daftar model Ollama — MURNI, tanpa `vscode`, aman di-unit-test. */
import { getJson, normalizeUrl } from "./http";
import { parseOpenAIModels } from "./protocol";

export const MODELS_TIMEOUT_MS = 8_000;

interface TagsResult {
  models?: Array<{ name?: unknown; model?: unknown }>;
}

/** Auto-fetch terbaru dari `GET {endpoint}/api/tags` (= `ollama list`). */
export async function listOllamaModels(endpoint: string): Promise<string[]> {
  const json = await getJson<TagsResult>(`${normalizeUrl(endpoint)}/api/tags`, {
    timeoutMs: MODELS_TIMEOUT_MS
  });
  if (!Array.isArray(json.models)) {
    return [];
  }
  const names = json.models
    .map((m) => {
      const item = (m ?? {}) as { name?: unknown; model?: unknown };
      if (typeof item.name === "string" && item.name.length > 0) {
        return item.name;
      }
      if (typeof item.model === "string" && item.model.length > 0) {
        return item.model;
      }
      return "";
    })
    .filter((n) => n.length > 0);
  return [...new Set(names)].sort();
}

/** Auto-fetch dari `GET {baseURL}/models` (gaya OpenAI: 9router, dll). */
export async function listOpenAIModels(
  baseURL: string,
  apiKey: string
): Promise<string[]> {
  const json = await getJson<unknown>(`${normalizeUrl(baseURL)}/models`, {
    headers: apiKey.length > 0 ? { Authorization: `Bearer ${apiKey}` } : {},
    timeoutMs: MODELS_TIMEOUT_MS
  });
  return parseOpenAIModels(json);
}
