import * as vscode from "vscode";
import type { EditTarget } from "../context/edit-target";
import { spliceText } from "./diff-text";
import { showDiffPreview } from "./diff";
import { showError } from "./output-panel";

/**
 * Apply via Diff Preview (menggantikan dialog konfirmasi buta):
 * user melihat perubahan dalam konteks file (native VS Code diff),
 * lalu Apply / Reject. `confirmApply=false` = terapkan langsung.
 * Yang di-apply = isi dokumen hasil preview (satu undo step).
 */

async function openTargetDoc(
  target: EditTarget
): Promise<vscode.TextDocument | undefined> {
  try {
    return await vscode.workspace.openTextDocument(target.uri);
  } catch (err) {
    showError(
      `File target tidak bisa dibuka: ${err instanceof Error ? err.message : String(err)}`
    );
    return undefined;
  }
}

function skipPreview(): boolean {
  return (
    vscode.workspace
      .getConfiguration("onyxPilot")
      .get<boolean>("confirmApply", true) === false
  );
}

async function applyModified(
  action: "Create" | "Improve",
  target: EditTarget,
  doc: vscode.TextDocument,
  modified: string
): Promise<void> {
  if (!skipPreview()) {
    const decision = await showDiffPreview(
      target.uri,
      modified,
      doc.languageId,
      action
    );
    if (decision !== "apply") {
      void vscode.window.showInformationMessage(
        `Onyx AI: ${action} dibatalkan, file tidak diubah.`
      );
      return;
    }
  }
  try {
    const editor = await vscode.window.showTextDocument(doc);
    const full = new vscode.Range(
      doc.positionAt(0),
      doc.positionAt(doc.getText().length)
    );
    await editor.edit((b) => b.replace(full, modified));
    void vscode.window.showInformationMessage(
      `Onyx AI: ${action} diterapkan ke ${target.fileLabel} (Ctrl+Z untuk undo).`
    );
  } catch (err) {
    showError(
      `Gagal menerapkan: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/** Create: sisipkan kode di posisi kursor, preview seluruh dokumen. */
export async function applyCreate(
  target: EditTarget,
  code: string
): Promise<void> {
  if (code.length === 0) {
    showError("Tidak ada kode untuk ditempel.");
    return;
  }
  const doc = await openTargetDoc(target);
  if (!doc) {
    return;
  }
  const off = doc.offsetAt(target.selection.active);
  await applyModified("Create", target, doc, spliceText(doc.getText(), off, off, code));
}

/** Improve: ganti selection (atau sisip bila kosong), preview seluruh dokumen. */
export async function applyImprove(
  target: EditTarget,
  code: string
): Promise<void> {
  if (code.length === 0) {
    showError("Tidak ada kode untuk ditempel.");
    return;
  }
  const doc = await openTargetDoc(target);
  if (!doc) {
    return;
  }
  const s = target.selection;
  const start = doc.offsetAt(s.start);
  const end = s.isEmpty ? start : doc.offsetAt(s.end);
  await applyModified(
    "Improve",
    target,
    doc,
    spliceText(doc.getText(), start, end, code)
  );
}
