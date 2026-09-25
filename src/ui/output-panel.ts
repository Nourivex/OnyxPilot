import * as vscode from "vscode";

let channel: vscode.OutputChannel | undefined;

/** Day 1–5: OutputChannel sederhana. Day 6 diganti Webview panel + Copy/Apply. */
export function showResult(action: string, body: string): void {
  if (!channel) {
    channel = vscode.window.createOutputChannel("Onyx AI");
  }
  channel.clear();
  channel.appendLine(`⚡ Onyx AI — ${action}`);
  channel.appendLine("─".repeat(40));
  channel.appendLine(body);
  channel.show(true);
}

export function showError(message: string): void {
  void vscode.window.showErrorMessage(`Onyx AI: ${message}`);
}

export function showWarning(message: string): void {
  void vscode.window.showWarningMessage(`Onyx AI: ${message}`);
}
