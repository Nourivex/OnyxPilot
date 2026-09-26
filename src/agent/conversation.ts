/**
 * Conversation state + pembentuk request chat — MURNI, tanpa `vscode`.
 * Chat bersifat read-only: menjawab/menjelaskan, TIDAK mengubah file.
 */
import type { AIRequest } from "../ai/provider";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

/** Batas riwayat yang dikirim agar hemat token. */
export const CHAT_HISTORY_LIMIT = 6;

export function buildChatRequest(
  history: ChatTurn[],
  contextBlock: string,
  input: string
): AIRequest {
  const recent = history.slice(-CHAT_HISTORY_LIMIT);
  const hist = recent
    .map((t) => `${t.role === "user" ? "User" : "Onyx"}: ${t.text}`)
    .join("\n\n");
  const parts = [`[Context]\n${contextBlock}`];
  if (hist.length > 0) {
    parts.push(`[History]\n${hist}`);
  }
  parts.push(`[Question]\n${input}`);
  return {
    system: [
      "You are Onyx, a coding assistant inside the VS Code sidebar.",
      "You can SEE the user's selected code and current file (see [Context]).",
      "Rules:",
      "- Answer in Bahasa Indonesia (code stays as-is).",
      "- Be concise; use ```fences for code.",
      "- READ-ONLY: you cannot edit files. Never claim you edited anything.",
      "- If the user wants code changed, point them to: right-click → Onyx AI → Improve/Create, or the Plan tab."
    ].join("\n"),
    user: parts.join("\n\n")
  };
}
