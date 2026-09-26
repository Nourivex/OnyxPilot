import * as vscode from "vscode";

export type DiffDecision = "apply" | "reject";

/**
 * Tampilkan native VS Code diff: kiri = file asli (target), kanan = dokumen
 * penuh berisi hasil AI. User melihat perubahan dalam konteks file, lalu
 * memilih Apply / Reject dari notifikasi (-dismiss = reject).
 * Berlaku untuk file tersimpan maupun blank page (untitled).
 */
export async function showDiffPreview(
  targetUri: vscode.Uri,
  modifiedText: string,
  language: string,
  action: string
): Promise<DiffDecision> {
  const preview = await vscode.workspace.openTextDocument({
    content: modifiedText,
    language
  });
  await vscode.commands.executeCommand(
    "vscode.diff",
    targetUri,
    preview.uri,
    `Onyx AI — ${action} Preview (kiri: asli, kanan: AI)`,
    { preview: true }
  );
  const pick = await vscode.window.showInformationMessage(
    `Onyx AI — ${action}: terapkan perubahan ini ke file?`,
    "Apply",
    "Reject"
  );
  await closeTab(preview.uri);
  return pick === "Apply" ? "apply" : "reject";
}

async function closeTab(uri: vscode.Uri): Promise<void> {
  const key = uri.toString();
  for (const group of vscode.window.tabGroups.all) {
    const tab = group.tabs.find((t) => {
      const input = t.input as { uri?: vscode.Uri } | undefined;
      return input?.uri?.toString() === key;
    });
    if (tab) {
      await vscode.window.tabGroups.close(tab, true);
      return;
    }
  }
}
