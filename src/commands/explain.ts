import * as vscode from "vscode";
import { getEditorContext, hasSelection } from "../context/editor-context";
import { buildExplain } from "../prompts/prompt-builder";
import { generateWithActiveProvider } from "../ai/index";
import { showError, showResult, showWarning } from "../ui/output-panel";

export async function runExplain(): Promise<void> {
  const ctx = getEditorContext();
  if (!ctx) {
    showWarning("Tidak ada editor aktif. Buka file dulu.");
    return;
  }
  if (!hasSelection(ctx)) {
    showWarning("Blok kode dulu, lalu klik kanan → Onyx AI → Explain.");
    return;
  }
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Onyx AI: Explain…" },
    async () => {
      try {
        const res = await generateWithActiveProvider(buildExplain(ctx));
        showResult("Explain", res.text);
      } catch (err) {
        showError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
