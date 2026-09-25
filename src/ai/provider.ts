/**
 * AI provider abstraction.
 * Command layer hanya depend ke AIProvider — tidak tahu model/endpoint.
 * Lihat docs/plans/04-ai-provider-ollama.md
 */

export interface AIRequest {
  system: string;
  user: string;
  /** Optional model override; default dari settings. */
  model?: string;
}

export interface AIResponse {
  text: string;
  model: string;
}

export interface AIProvider {
  readonly id: "ollama" | "openai-compatible";
  generate(request: AIRequest): Promise<AIResponse>;
}
