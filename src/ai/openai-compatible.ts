import * as vscode from "vscode";
import type { AIProvider, AIRequest, AIResponse } from "./provider";
import { HttpError, normalizeUrl, postJson } from "./http";
import { buildChatPayload, parseChatResult } from "./protocol";

/** OpenAI-compatible (bisa menunjuk ke Ollama /v1 atau cloud). */
export class OpenAICompatibleProvider implements AIProvider {
  readonly id = "openai-compatible" as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const config = vscode.workspace.getConfiguration("onyxPilot");
    const baseURL = normalizeUrl(
      config.get<string>("openaiCompatible.baseURL", "http://localhost:11434/v1")
    );
    const apiKey = config.get<string>("openaiCompatible.apiKey", "ollama");
    const model =
      request.model ?? config.get<string>("openaiCompatible.model", "qwen3:8b");
    try {
      const json = await postJson<unknown>(
        `${baseURL}/chat/completions`,
        buildChatPayload(model, request),
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      return parseChatResult(json, model);
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        throw new Error(
          `API tidak ditemukan (404) di ${baseURL}/chat/completions. ` +
            `Pastikan baseURL benar dan diakhiri /v1, cth. http://localhost:20128/v1.`
        );
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("Tidak bisa terhubung")) {
        throw new Error(
          `${msg}\nPeriksa baseURL + apiKey via Settings → OnyxPilot (provider "openai-compatible").`
        );
      }
      throw err instanceof Error ? err : new Error(msg);
    }
  }
}
