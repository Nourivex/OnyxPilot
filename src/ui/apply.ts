import * as vscode from "vscode";
import {
  insertAtTarget,
  replaceAtTarget,
  type EditTarget
} from "../context/edit-target";
import { showError } from "./output-panel";

function lines(code: string): number {
  return code.split("\n").length;
}

function selectionLines(target: EditTarget): number {
  const s = target.selection;
  return s.isEmpty ? 0 : s.end.line - s.start.line + 1;
}

async function confirmed(message: string): Promise<boolean> {
  const skip =
    vscode.workspace
      .getConfiguration("onyxPilot")
      .get<boolean>("confirmApply", true) === false;
  if (skip) {
    return true;
  }
  const pick = await vscode.window.showInformationMessage(
    message,
    { modal: true },
    "Tempel",
    "Batal"
  );
  return pick === "Tempel";
}

/** Create: tempel kode di posisi kursor file target. */
export async function applyCreate(
  target: EditTarget,
  code: string
): Promise<void> {
  if (code.length === 0) {
    showError("Tidak ada kode untuk ditempel.");
    return;
  }
  const ok = await confirmed(
    `Onyx AI — Create: tempel ${lines(code)} baris ke ${target.fileLabel}?`
  );
  if (!ok) {
    return;
  }
  try {
    await insertAtTarget(target, code);
    void vscode.window.showInformationMessage(
      `Onyx AI: kode ditempel ke ${target.fileLabel} (Ctrl+Z untuk undo).`
    );
  } catch (err) {
    showError(
      `Gagal menempel: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/** Improve: ganti selection dengan kode hasil AI. */
export async function applyImprove(
  target: EditTarget,
  code: string
): Promise<void> {
  if (code.length === 0) {
    showError("Tidak ada kode untuk ditempel.");
    return;
  }
  const sel = selectionLines(target);
  const ok = await confirmed(
    sel > 0
      ? `Onyx AI — Improve: ganti ${sel} baris selection dengan ${lines(code)} baris di ${target.fileLabel}?`
      : `Onyx AI — Improve: tempel ${lines(code)} baris ke ${target.fileLabel}?`
  );
  if (!ok) {
    return;
  }
  try {
    await replaceAtTarget(target, code);
    void vscode.window.showInformationMessage(
      `Onyx AI: kode ditempel ke ${target.fileLabel} (Ctrl+Z untuk undo).`
    );
  } catch (err) {
    showError(
      `Gagal menempel: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
