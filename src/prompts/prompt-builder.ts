import type { EditorContext } from "../context/context-types";
import type { AIRequest } from "../ai/provider";

function header(ctx: EditorContext): string {
  return `Context:\nLanguage: ${ctx.language}\nFile: ${ctx.fileName}\n\nCode:\n${ctx.selectedCode}`;
}

/** Audit: review tanpa modifikasi kode. Lihat docs/plans/05-prompt-engine.md */
export function buildAudit(ctx: EditorContext): AIRequest {
  return {
    system: [
      "You are a software code reviewer.",
      "Analyze the provided code.",
      "Rules:",
      "- Do not modify the code.",
      "- Identify concrete problems.",
      "- Separate confirmed issues from suggestions.",
      "- Explain why each issue matters.",
      "- Prioritize issues by severity."
    ].join("\n"),
    user: header(ctx)
  };
}

/** Improve: perbaiki tanpa mengubah behavior. `focus` = permintaan user (opsional). */
export function buildImprove(ctx: EditorContext, focus?: string): AIRequest {
  const user =
    focus && focus.trim().length > 0
      ? `${header(ctx)}\n\nFocus:\n${focus.trim()}`
      : header(ctx);
  return {
    system: [
      "You are a software improvement assistant.",
      "Improve the selected code while preserving its intended behavior.",
      "Rules:",
      "- Do not change behavior unnecessarily.",
      "- Prefer simple maintainable solutions.",
      "- Identify important changes.",
      "- Return the improved code.",
      "- Explain the changes briefly.",
      "- If a Focus is given, prioritize it."
    ].join("\n"),
    user
  };
}

/** Explain: jelaskan, tanpa modifikasi kode. */
export function buildExplain(ctx: EditorContext): AIRequest {
  return {
    system: [
      "You are a patient code explainer.",
      "Explain what the provided code does.",
      "Rules:",
      "- Do not modify the code.",
      "- Explain step by step in plain language.",
      "- Mention important edge cases or risks."
    ].join("\n"),
    user: header(ctx)
  };
}

/** Create: buat kode dari instruksi user. */
export function buildCreate(ctx: EditorContext, instruction: string): AIRequest {
  return {
    system: [
      "You are a coding assistant.",
      "Create code based on the user's instruction.",
      "Rules:",
      "- Follow the requested language of the current file.",
      "- Return the code plus a brief explanation separately."
    ].join("\n"),
    user:
      `Context:\nLanguage: ${ctx.language}\nFile: ${ctx.fileName}\n\n` +
      `Existing selection:\n${ctx.selectedCode}\n\nRequest:\n${instruction}`
  };
}
