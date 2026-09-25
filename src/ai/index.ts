import * as vscode from "vscode";
import type { AIProvider, AIRequest, AIResponse } from "./provider";
import { OllamaProvider } from "./ollama";
import { OpenAICompatibleProvider } from "./openai-compatible";

export type ProviderId = "ollama" | "openai-compatible";

/** Baca provider aktif dari settings. Real HTTP call diimplementasi Day 4. */
export function getActiveProvider(): AIProvider {
  const config = vscode.workspace.getConfiguration("onyxPilot");
  const id = config.get<ProviderId>("provider", "ollama");
  if (id === "openai-compatible") {
    return new OpenAICompatibleProvider();
  }
  return new OllamaProvider();
}

/** Helper untuk command layer: kirim prompt via provider aktif. */
export async function generateWithActiveProvider(
  request: AIRequest
): Promise<AIResponse> {
  const provider = getActiveProvider();
  return provider.generate(request);
}
