/**
 * Tipe + helper MURNI — tanpa dependensi `vscode`, aman di-unit-test.
 * Kode yang menyentuh VS Code API tinggal di `editor-context.ts`.
 */

export interface EditorContext {
  language: string;
  fileName: string;
  selectedCode: string;
  /** 0-based, mengikuti vscode.Range */
  startLine: number;
  endLine: number;
}

export function buildEditorContext(
  language: string,
  fileName: string,
  selectedCode: string,
  startLine: number,
  endLine: number
): EditorContext {
  return { language, fileName, selectedCode, startLine, endLine };
}

/** True bila ada selection non-kosong (untuk Audit/Improve/Explain). */
export function hasSelection(ctx: EditorContext | undefined): boolean {
  return !!ctx && ctx.selectedCode.trim().length > 0;
}
