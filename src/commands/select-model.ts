import * as vscode from "vscode";
import { listOllamaModels, listOpenAIModels } from "../ai/models";
import { normalizeUrl } from "../ai/http";
import { showError, showWarning } from "../ui/output-panel";

/**
 * QuickPick model dari server terbaru → simpan ke Settings.
 * Ollama: `GET {endpoint}/api/tags`. OpenAI-compatible (9router, dll):
 * `GET {baseURL}/models` dengan Bearer apiKey.
 */
export async function runSelectModel(): Promise<void> {
  const config = vscode.workspace.getConfiguration("onyxPilot");
  const provider = config.get<string>("provider", "ollama");

  if (provider === "openai-compatible") {
    await runSelectOpenAIModel(config);
    return;
  }

  const endpoint = normalizeUrl(
    config.get<string>("ollama.endpoint", "http://localhost:11434")
  );

  let models: string[];
  try {
    models = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Onyx AI: memuat model dari ${endpoint}…`
      },
      () => listOllamaModels(endpoint)
    );
  } catch (err) {
    showError(
      `Tidak bisa memuat daftar model dari ${endpoint}. ` +
        `Pastikan Ollama jalan ("ollama serve"). Detail: ${err instanceof Error ? err.message : String(err)}`
    );
    return;
  }

  if (models.length === 0) {
    showWarning(
      `Tidak ada model di ${endpoint}. Pull dulu, mis. "ollama pull gemma12b:latest".`
    );
    return;
  }

  const pick = await vscode.window.showQuickPick(models, {
    placeHolder: "Pilih model Ollama untuk Onyx AI",
    title: "Onyx AI — Model"
  });
  if (!pick) {
    return;
  }
  await config.update("ollama.model", pick, vscode.ConfigurationTarget.Global);
  void vscode.window.showInformationMessage(`Onyx AI: model Ollama → ${pick}.`);
}

async function runSelectOpenAIModel(
  config: vscode.WorkspaceConfiguration
): Promise<void> {
  const baseURL = normalizeUrl(
    config.get<string>("openaiCompatible.baseURL", "http://localhost:11434/v1")
  );
  const apiKey = config.get<string>("openaiCompatible.apiKey", "") ?? "";

  let models: string[];
  try {
    models = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Onyx AI: memuat model dari ${baseURL}…`
      },
      () => listOpenAIModels(baseURL, apiKey)
    );
  } catch (err) {
    showError(
      `Tidak bisa memuat daftar model dari ${baseURL}. ` +
        `Pastikan baseURL diakhiri /v1 dan apiKey benar (Settings → OnyxPilot). ` +
        `Detail: ${err instanceof Error ? err.message : String(err)}`
    );
    return;
  }

  if (models.length === 0) {
    showWarning(`Tidak ada model di ${baseURL}. Periksa baseURL + apiKey.`);
    return;
  }

  const pick = await vscode.window.showQuickPick(models, {
    placeHolder: "Pilih model OpenAI-compatible untuk Onyx AI",
    title: "Onyx AI — Model"
  });
  if (!pick) {
    return;
  }
  await config.update(
    "openaiCompatible.model",
    pick,
    vscode.ConfigurationTarget.Global
  );
  void vscode.window.showInformationMessage(`Onyx AI: model → ${pick}.`);
}
