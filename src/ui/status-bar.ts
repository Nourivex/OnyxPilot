import * as vscode from "vscode";

let item: vscode.StatusBarItem | undefined;

/** Status bar `⚡ Onyx: <model>` — klik untuk ganti model. */
export function initStatusBar(context: vscode.ExtensionContext): void {
  if (!item) {
    item = vscode.window.createStatusBarItem(
      "onyxPilot.model",
      vscode.StatusBarAlignment.Left,
      100
    );
    item.command = "onyxPilot.selectModel";
    item.tooltip = "Onyx AI — klik untuk ganti model";
    context.subscriptions.push(item);
  }
  updateStatusBar();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("onyxPilot")) {
        updateStatusBar();
      }
    })
  );
}

export function updateStatusBar(): void {
  if (!item) {
    return;
  }
  const config = vscode.workspace.getConfiguration("onyxPilot");
  const provider = config.get<string>("provider", "ollama");
  const model =
    provider === "openai-compatible"
      ? config.get<string>("openaiCompatible.model", "")
      : config.get<string>("ollama.model", "");
  item.text = `$(zap) Onyx: ${model || "—"}`;
  item.show();
}
