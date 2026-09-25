import * as vscode from "vscode";

export interface EditTarget {
  uri: vscode.Uri;
  /** Selection/cursor saat command dipanggil (sebelum request AI). */
  selection: vscode.Selection;
  fileLabel: string;
}

/**
 * Jepret editor + posisi cursor SEBELUM request AI.
 * Hasil AI ditempel ke dokumen/posisi ini — bukan "editor aktif saat respons
 * tiba" yang mungkin sudah pindah. Berlaku untuk file tersimpan maupun
 * blank page (untitled).
 */
export function captureEditTarget(): EditTarget | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  const raw =
    editor.document.fileName.split(/[\\/]/).pop() ?? editor.document.fileName;
  return {
    uri: editor.document.uri,
    selection: editor.selection,
    fileLabel: editor.document.isUntitled ? `${raw} (unsaved)` : raw
  };
}

async function showTarget(target: EditTarget): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument(target.uri);
  return vscode.window.showTextDocument(doc);
}

/** Sisipkan kode di posisi cursor (Create). Tidak menimpa teks lain. */
export async function insertAtTarget(
  target: EditTarget,
  code: string
): Promise<void> {
  const editor = await showTarget(target);
  await editor.edit((b) => b.insert(target.selection.active, code));
}

/**
 * Ganti selection dengan kode (Improve). Selection kosong → sisipkan.
 * Catatan: posisi dijepret saat command dipanggil; edit manual di sela
 * request AI bisa menggeser posisi (diff preview penuh: Day 7).
 */
export async function replaceAtTarget(
  target: EditTarget,
  code: string
): Promise<void> {
  const editor = await showTarget(target);
  if (target.selection.isEmpty) {
    await editor.edit((b) => b.insert(target.selection.active, code));
    return;
  }
  await editor.edit((b) => b.replace(target.selection, code));
}
