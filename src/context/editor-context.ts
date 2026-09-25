import * as vscode from "vscode";
import type { EditorContext } from "./context-types";
import { buildEditorContext } from "./context-types";

export type { EditorContext } from "./context-types";
export { buildEditorContext, hasSelection } from "./context-types";

/**
 * Ambil konteks dari editor aktif.
 * Return undefined bila tidak ada editor aktif (caller tampilkan pesan ramah).
 */
export function getEditorContext(): EditorContext | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  const { document, selection } = editor;
  const selectedCode = document.getText(selection);
  const fileName = document.fileName.split(/[\\/]/).pop() ?? document.fileName;
  return buildEditorContext(
    document.languageId,
    fileName,
    selectedCode,
    selection.start.line,
    selection.end.line
  );
}
