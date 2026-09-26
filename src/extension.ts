import * as vscode from "vscode";
import { runAudit } from "./commands/audit";
import { runImprove } from "./commands/improve";
import { runExplain } from "./commands/explain";
import { runCreate } from "./commands/create";
import { runSelectModel } from "./commands/select-model";
import { OnyxSidebarProvider } from "./sidebar/onyx-sidebar";
import { initStatusBar } from "./ui/status-bar";

export function activate(context: vscode.ExtensionContext): void {
  const sidebar = new OnyxSidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      OnyxSidebarProvider.viewId,
      sidebar
    ),
    vscode.commands.registerCommand("onyxPilot.audit", () => runAudit()),
    vscode.commands.registerCommand("onyxPilot.improve", () => runImprove()),
    vscode.commands.registerCommand("onyxPilot.explain", () => runExplain()),
    vscode.commands.registerCommand("onyxPilot.create", () => runCreate()),
    vscode.commands.registerCommand("onyxPilot.selectModel", () =>
      runSelectModel()
    ),
    vscode.window.onDidChangeTextEditorSelection(() => sidebar.pushState()),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void sidebar.rescanProject();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("onyxPilot")) {
        sidebar.pushState();
      }
    })
  );
  initStatusBar(context);
}

export function deactivate(): void {
  // No-op: tidak ada resource yang perlu dibersihkan.
}
