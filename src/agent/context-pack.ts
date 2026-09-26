/**
 * Kemas konteks editor untuk chat — MURNI, tanpa `vscode`.
 * Pembaca file (vscode API) ada di sidebar; fungsi ini hanya memformat.
 */
import type { EditorContext } from "../context/context-types";

export interface ChatContextInput {
  selection: EditorContext | null;
  /** Isi penuh file aktif (boleh "" bila tidak ada). */
  fileText: string;
  fileName: string;
  language: string;
}

export const MAX_FILE_CHARS = 6000;

export interface ContextPack {
  block: string;
  /** Label ringkas untuk chip UI, mis. "12 baris • api.php". */
  label: string;
}

export function buildContextBlock(input: ChatContextInput): ContextPack {
  const sel = input.selection;
  const hasSel = !!sel && sel.selectedCode.trim().length > 0;
  if (!hasSel && input.fileText.trim().length === 0) {
    return { block: "(no editor open)", label: "tidak ada editor" };
  }
  const parts: string[] = [];
  const labels: string[] = [];
  if (hasSel && sel) {
    parts.push(
      `[Selection: ${sel.fileName} lines ${sel.startLine + 1}-${sel.endLine + 1} (${sel.language})]\n${sel.selectedCode}`
    );
    labels.push(`${sel.endLine - sel.startLine + 1} baris • ${sel.fileName}`);
  }
  if (input.fileText.trim().length > 0) {
    const t =
      input.fileText.length > MAX_FILE_CHARS
        ? input.fileText.slice(0, MAX_FILE_CHARS) + "\n…[dipotong]"
        : input.fileText;
    parts.push(`[Current file: ${input.fileName} (${input.language})]\n${t}`);
    if (labels.length === 0) {
      labels.push(`file ${input.fileName}`);
    }
  }
  return { block: parts.join("\n\n"), label: labels.join(" + ") };
}
