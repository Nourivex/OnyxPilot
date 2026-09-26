/**
 * Kemas konteks editor untuk chat — MURNI, tanpa `vscode`.
 * Pembaca file (vscode API) ada di sidebar; fungsi ini hanya memformat.
 */
import type { EditorContext } from "../context/context-types";

export interface RelatedFile {
  path: string;
  text: string;
}

export interface ChatContextInput {
  selection: EditorContext | null;
  /** Isi penuh file aktif (boleh "" bila tidak ada). */
  fileText: string;
  fileName: string;
  language: string;
  /** Ringkasan project, mis. "Laravel • PHP 8.2" ("" = tak dikenal). */
  project?: string;
  /** File terkait (sudah di-budget pemanggil). */
  related?: RelatedFile[];
}

export const MAX_FILE_CHARS = 6000;

/** Selection raksasa ikut dipotong agar tak menghabiskan konteks. */
export const MAX_SELECTION_CHARS = 4000;

export interface ContextPack {
  block: string;
  /** Label ringkas untuk chip UI, mis. "12 baris • api.php". */
  label: string;
}

export function buildContextBlock(input: ChatContextInput): ContextPack {
  const sel = input.selection;
  const hasSel = !!sel && sel.selectedCode.trim().length > 0;
  const related = (input.related ?? []).filter((r) => r.text.trim().length > 0);
  const project = (input.project ?? '').trim();
  if (!hasSel && input.fileText.trim().length === 0 && related.length === 0) {
    return {
      block: project.length > 0 ? `[Project: ${project}]\n(no editor open)` : '(no editor open)',
      label: project.length > 0 ? project : 'tidak ada editor'
    };
  }
  const parts: string[] = [];
  const labels: string[] = [];
  if (project.length > 0) {
    parts.push(`[Project: ${project}]`);
  }
  if (hasSel && sel) {
    const code =
      sel.selectedCode.length > MAX_SELECTION_CHARS
        ? sel.selectedCode.slice(0, MAX_SELECTION_CHARS) + '\n…[dipotong]'
        : sel.selectedCode;
    parts.push(
      `[Selection: ${sel.fileName} lines ${sel.startLine + 1}-${sel.endLine + 1} (${sel.language})]\n${code}`
    );
    labels.push(`${sel.endLine - sel.startLine + 1} baris • ${sel.fileName}`);
  }
  if (input.fileText.trim().length > 0) {
    const t =
      input.fileText.length > MAX_FILE_CHARS
        ? input.fileText.slice(0, MAX_FILE_CHARS) + '\n…[dipotong]'
        : input.fileText;
    parts.push(`[Current file: ${input.fileName} (${input.language})]\n${t}`);
    if (labels.length === 0) {
      labels.push(`file ${input.fileName}`);
    }
  }
  for (const r of related) {
    parts.push(`[Related: ${r.path}]\n${r.text}`);
  }
  if (related.length > 0) {
    labels.push(`+ ${related.length} terkait`);
  }
  return { block: parts.join('\n\n'), label: labels.join(' ') };
}
