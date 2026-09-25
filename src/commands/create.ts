import * as vscode from "vscode";
import { getEditorContext } from "../context/editor-context";
import { captureEditTarget } from "../context/edit-target";
import { buildCreate } from "../prompts/prompt-builder";
import { generateWithActiveProvider } from "../ai/index";
import { extractPrimaryCode } from "../ai/code-extract";
import { showError, showResult, showWarning } from "../ui/output-panel";
import { applyCreate } from "../ui/apply";

export async function runCreate(): Promise<void> {
  // Jepret target DULU — kode ditempel ke file/posisi ini, bukan ke
  // "editor aktif saat respons tiba" yang mungkin sudah pindah.
  const target = captureEditTarget();
  const ctx = getEditorContext();
  if (!target || !ctx) {
    showWarning("Tidak ada editor aktif. Buka file dulu.");
    return;
  }
  const instruction = await vscode.window.showInputBox({
    prompt: "Onyx AI — Create: mau dibuatkan kode apa?",
    placeHolder: "cth: buatkan fungsi retry dengan exponential backoff"
  });
  if (!instruction) {
    return;
  }
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Onyx AI: Create…" },
    async () => {
      try {
        const res = await generateWithActiveProvider(buildCreate(ctx, instruction));
        showResult("Create", res.text);
        await applyCreate(target, extractPrimaryCode(res.text));
      } catch (err) {
        showError(err instanceof Error ? err.message : String(err));
      }
    }
  );
}
