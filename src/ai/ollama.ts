import * as vscode from "vscode";
import type { AIProvider, AIRequest, AIResponse } from "./provider";
import { normalizeUrl, postJson } from "./http";
import { buildOllamaPayload, parseOllamaResult } from "./protocol";

/** Default local provider. Endpoint + model dibaca dari Settings. */
export class OllamaProvider implements AIProvider {
  readonly id = "ollama" as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const config = vscode.workspace.getConfiguration("onyxPilot");
    const endpoint = normalizeUrl(
      config.get<string>("ollama.endpoint", "http://localhost:11434")
    );
    const model =
      request.model ?? config.get<string>("ollama.model", "qwen3:8b");
    const think = config.get<boolean>("ollama.think", true);
    const temperature = config.get<number>("ollama.temperature", 0.8);
    const numPredict = config.get<number>("ollama.numPredict", 0);
    try {
      const json = await postJson<unknown>(
        `${endpoint}/api/generate`,
        buildOllamaPayload(model, request, { think, temperature, numPredict })
      );
      return parseOllamaResult(json, model);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("Tidak bisa terhubung")) {
        throw new Error(
          `${msg}\nPastikan Ollama jalan (cek "ollama serve" / buka ${endpoint}), ` +
            `lalu sesuaikan endpoint via Settings → OnyxPilot.`
        );
      }
      throw err instanceof Error ? err : new Error(msg);
    }
  }
}
