import * as vscode from "vscode";
import { getEditorContext, hasSelection } from "../context/editor-context";
import { captureEditTarget } from "../context/edit-target";
import { buildImprove } from "../prompts/prompt-builder";
import { generateWithActiveProvider } from "../ai/index";
import { extractPrimaryCode } from "../ai/code-extract";
import { showError, showResult, showWarning } from "../ui/output-panel";
import { applyImprove } from "../ui/apply";

export async function runImprove(): Promise<void> {
  const target = captureEditTarget();
  const ctx = getEditorContext();
  if (!target || !ctx) {
    showWarning("Tidak ada editor aktif. Buka file dulu.");
    return;
  }
  if (!hasSelection(ctx)) {
    showWarning("Blok kode dulu, lalu klik kanan → Onyx AI → Improve.");
    return;
  }
  // Tanya dulu (langsung muncul = bukti command jalan), Enter = general improve.
  const focus = await vscode.window.showInputBox({
    prompt: "Onyx AI — Improve: fokus perbaikan apa? (Enter = general improve, Esc = batal)",
    placeHolder: "cth: jadikan OOP + tambah validasi input"
  });
  if (focus === undefined) {
    return;
  }
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Onyx AI: Improve…" },
    async () => {
      try {
        const req = buildImprove(ctx, focus.trim().length > 0 ? focus : undefined);
        const res = await generateWithActiveProvider(req);
        showResult("Improve", res.text);
        await applyImprove(target, extractPrimaryCode(res.text));
      } catch (err) {
        showError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
