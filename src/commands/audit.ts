import * as vscode from "vscode";
import { getEditorContext, hasSelection } from "../context/editor-context";
import { buildAudit } from "../prompts/prompt-builder";
import { generateWithActiveProvider } from "../ai/index";
import { showError, showResult, showWarning } from "../ui/output-panel";

/** Day 3 end-to-end: selection → prompt → (mock) provider → output panel. */
export async function runAudit(): Promise<void> {
  const ctx = getEditorContext();
  if (!ctx) {
    showWarning("Tidak ada editor aktif. Buka file dulu.");
    return;
  }
  if (!hasSelection(ctx)) {
    showWarning("Blok kode dulu, lalu klik kanan → Onyx AI → Audit.");
    return;
  }
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Onyx AI: Audit…" },
    async () => {
      try {
        const res = await generateWithActiveProvider(buildAudit(ctx));
        showResult("Audit", res.text);
      } catch (err) {
        showError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
