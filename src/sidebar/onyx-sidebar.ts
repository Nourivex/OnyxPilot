import * as vscode from "vscode";
import { getEditorContext, hasSelection } from "../context/editor-context";
import { normalizeUrl } from "../ai/http";
import { listOllamaModels, listOpenAIModels } from "../ai/models";
import { runAudit } from "../commands/audit";
import { runImprove } from "../commands/improve";
import { runExplain } from "../commands/explain";
import { runCreate } from "../commands/create";

type ActionId = "audit" | "improve" | "explain" | "create";

interface SidebarMessage {
  type:
    | "ready"
    | "refreshModels"
    | "runAction"
    | "setProvider"
    | "setModel"
    | "setConfig"
    | "openSettings";
  action?: ActionId;
  provider?: string;
  model?: string;
  key?: string;
  value?: boolean | number;
}

/** Sidebar Onyx AI: provider, model (auto-fetch), status, selection, aksi. */
export class OnyxSidebarProvider implements vscode.WebviewViewProvider {
  static readonly viewId = "onyxPilot.sidebar";

  private view?: vscode.WebviewView;
  private models: string[] = [];
  private connected: boolean | null = null;
  private loadingModels = false;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(
    view: vscode.WebviewView,
    _ctx: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };
    view.webview.html = this.getHtml();
    view.webview.onDidReceiveMessage((msg: SidebarMessage) =>
      this.onMessage(msg)
    );
    view.onDidDispose(() => {
      this.view = undefined;
    });
    void this.refresh();
  }

  /** Fetch ulang daftar model dari server aktif lalu dorong state ke webview. */
  async refresh(): Promise<void> {
    this.loadingModels = true;
    this.pushState();
    const config = vscode.workspace.getConfiguration("onyxPilot");
    const provider = config.get<string>("provider", "ollama");
    try {
      if (provider === "openai-compatible") {
        const baseURL = normalizeUrl(
          config.get<string>(
            "openaiCompatible.baseURL",
            "http://localhost:11434/v1"
          )
        );
        const apiKey =
          config.get<string>("openaiCompatible.apiKey", "") ?? "";
        this.models = await listOpenAIModels(baseURL, apiKey);
      } else {
        this.models = await listOllamaModels(this.ollamaEndpoint());
      }
      this.connected = true;
    } catch {
      this.models = [];
      this.connected = false;
    }
    this.loadingModels = false;
    this.pushState();
  }

  /** Dorong state terbaru (dipanggil saat selection / config berubah). */
  pushState(): void {
    if (!this.view) {
      return;
    }
    const config = vscode.workspace.getConfiguration("onyxPilot");
    const provider = config.get<string>("provider", "ollama");
    const model =
      provider === "openai-compatible"
        ? config.get<string>("openaiCompatible.model", "")
        : config.get<string>("ollama.model", "");
    const think = config.get<boolean>("ollama.think", true);
    const temperature = config.get<number>("ollama.temperature", 0.8);
    const numPredict = config.get<number>("ollama.numPredict", 0);
    const ctx = getEditorContext();
    this.view.webview.postMessage({
      type: "state",
      provider,
      endpoint: this.ollamaEndpoint(),
      model: model ?? "",
      models: this.models,
      think,
      temperature,
      numPredict,
      connected: this.connected,
      loadingModels: this.loadingModels,
      selection:
        ctx && hasSelection(ctx)
          ? {
              lines: ctx.endLine - ctx.startLine + 1,
              fileName: ctx.fileName,
              language: ctx.language
            }
          : null
    });
  }

  private ollamaEndpoint(): string {
    return normalizeUrl(
      vscode.workspace
        .getConfiguration("onyxPilot")
        .get<string>("ollama.endpoint", "http://localhost:11434")
    );
  }

  private async onMessage(msg: SidebarMessage): Promise<void> {
    const config = vscode.workspace.getConfiguration("onyxPilot");
    switch (msg.type) {
      case "ready":
      case "refreshModels":
        await this.refresh();
        break;
      case "runAction":
        await this.runAction(msg.action);
        break;
      case "setProvider":
        if (msg.provider === "ollama" || msg.provider === "openai-compatible") {
          await config.update(
            "provider",
            msg.provider,
            vscode.ConfigurationTarget.Global
          );
        }
        this.pushState();
        break;
      case "setModel": {
        if (!msg.model) {
          return;
        }
        const provider = config.get<string>("provider", "ollama");
        const key =
          provider === "openai-compatible"
            ? "openaiCompatible.model"
            : "ollama.model";
        await config.update(key, msg.model, vscode.ConfigurationTarget.Global);
        this.pushState();
        break;
      }
      case "setConfig":
        await this.setConfig(msg.key, msg.value);
        this.pushState();
        break;
      case "openSettings":
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "OnyxPilot"
        );
        break;
    }
  }

  /** Tulis satu setting Ollama dari sidebar (whitelist + validasi tipe). */
  private async setConfig(
    key: string | undefined,
    value: boolean | number | undefined
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration("onyxPilot");
    if (key === "ollama.think" && typeof value === "boolean") {
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    } else if (
      (key === "ollama.temperature" || key === "ollama.numPredict") &&
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    }
  }

  private async runAction(action: ActionId | undefined): Promise<void> {
    switch (action) {
      case "audit":
        await runAudit();
        break;
      case "improve":
        await runImprove();
        break;
      case "explain":
        await runExplain();
        break;
      case "create":
        await runCreate();
        break;
      default:
        break;
    }
  }

  private getHtml(): string {
    const nonce = [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 12px; margin: 0; }
  h1 { font-size: 14px; margin: 0 0 12px; display: flex; align-items: center; gap: 6px; }
  .card { background: var(--vscode-sideBar-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 10px; margin-bottom: 10px; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; opacity: .7; margin-bottom: 4px; }
  select, button { width: 100%; box-sizing: border-box; }
  select { background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 4px; padding: 6px; }
  .row { display: flex; gap: 6px; }
  .row select { flex: 1; }
  .icon-btn { width: auto; flex: none; padding: 6px 10px; cursor: pointer; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; }
  .actions button { margin-bottom: 6px; padding: 8px; cursor: pointer; border: none; border-radius: 4px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); text-align: left; }
  .actions button:disabled { opacity: .45; cursor: default; }
  .actions button:last-child { margin-bottom: 0; }
  .status { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--vscode-descriptionForeground); flex: none; }
  .dot.ok { background: var(--vscode-testing-iconPassed, #4caf50); }
  .dot.err { background: var(--vscode-testing-iconFailed, #f44336); }
  .sel { font-size: 12px; }
  .link { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; padding: 4px 0; text-align: left; }
  .hint { font-size: 11px; opacity: .7; margin-top: 6px; }
  .param-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
  .param-row:last-child { margin-bottom: 0; }
  .param-row > span { font-size: 12px; }
  .param-row select, .param-row input { width: 110px; flex: none; }
  input[type="number"] { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 4px; padding: 6px; box-sizing: border-box; }
</style>
</head>
<body>
  <h1>⚡ Onyx AI</h1>

  <div class="card">
    <div class="label">Provider</div>
    <select id="provider">
      <option value="ollama">Ollama (lokal)</option>
      <option value="openai-compatible">OpenAI-compatible</option>
    </select>
    <div class="hint status" style="margin-top:8px"><span id="dot" class="dot"></span><span id="conn">…</span></div>
  </div>

  <div class="card">
    <div class="label">Model</div>
    <div class="row">
      <select id="model"></select>
      <button id="refresh" class="icon-btn" title="Muat ulang daftar model dari server">⟳</button>
    </div>
    <div id="endpoint" class="hint"></div>
  </div>

  <div class="card" id="params">
    <div class="label">Parameters (Ollama)</div>
    <div class="param-row"><span>Think</span><select id="think"><option value="true">On</option><option value="false">Off</option></select></div>
    <div class="param-row"><span>Temperature</span><input id="temp" type="number" min="0" max="2" step="0.1"></div>
    <div class="param-row"><span>Max tokens</span><input id="maxtok" type="number" min="0" step="128"></div>
    <div class="hint">Max tokens 0 = default Ollama</div>
  </div>

  <div class="card">
    <div class="label">Selected code</div>
    <div id="sel" class="sel">—</div>
  </div>

  <div class="card actions">
    <div class="label">Actions</div>
    <button data-action="audit">🔍 Audit</button>
    <button data-action="improve">✨ Improve</button>
    <button data-action="explain">💡 Explain</button>
    <button data-action="create">📝 Create</button>
  </div>

  <button id="settings" class="link">⚙ Settings</button>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const providerEl = $("provider"), modelEl = $("model"), dotEl = $("dot"),
        connEl = $("conn"), selEl = $("sel"), endpointEl = $("endpoint"),
        refreshBtn = $("refresh"), thinkEl = $("think"),
        tempEl = $("temp"), maxtokEl = $("maxtok");

  window.addEventListener("message", (e) => {
    const s = e.data;
    if (!s || s.type !== "state") return;
    providerEl.value = s.provider;
    // Bangun ulang opsi model via DOM API (aman dari injeksi).
    modelEl.textContent = "";
    const names = s.models.includes(s.model) || !s.model ? s.models : [s.model, ...s.models];
    if (names.length === 0) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = s.loadingModels ? "Memuat…" : "(tidak ada model)";
      modelEl.appendChild(o);
    }
    for (const n of names) {
      const o = document.createElement("option");
      o.value = n;
      o.textContent = n;
      if (n === s.model) o.selected = true;
      modelEl.appendChild(o);
    }
    if (s.connected === true) {
      dotEl.className = "dot ok";
      connEl.textContent = "Connected";
    } else if (s.connected === false) {
      dotEl.className = "dot err";
      connEl.textContent = "Offline — cek ollama serve";
    } else {
      dotEl.className = "dot";
      connEl.textContent = "…";
    }
    endpointEl.textContent = s.provider === "ollama" ? s.endpoint : "";
    thinkEl.value = String(s.think);
    tempEl.value = String(s.temperature);
    maxtokEl.value = String(s.numPredict);
    $("params").style.display = s.provider === "ollama" ? "" : "none";
    selEl.textContent = s.selection
      ? s.selection.lines + " baris • " + s.selection.fileName + " (" + s.selection.language + ")"
      : "Blok kode dulu di editor";
    document.querySelectorAll("button[data-action]").forEach((b) => {
      b.disabled = !s.selection && b.dataset.action !== "create";
    });
    refreshBtn.disabled = s.loadingModels;
  });

  providerEl.addEventListener("change", () => vscode.postMessage({ type: "setProvider", provider: providerEl.value }));
  modelEl.addEventListener("change", () => vscode.postMessage({ type: "setModel", model: modelEl.value }));
  refreshBtn.addEventListener("click", () => vscode.postMessage({ type: "refreshModels" }));
  thinkEl.addEventListener("change", () => vscode.postMessage({ type: "setConfig", key: "ollama.think", value: thinkEl.value === "true" }));
  tempEl.addEventListener("change", () => {
    const v = parseFloat(tempEl.value);
    if (Number.isFinite(v)) vscode.postMessage({ type: "setConfig", key: "ollama.temperature", value: v });
  });
  maxtokEl.addEventListener("change", () => {
    const v = parseInt(maxtokEl.value, 10);
    if (Number.isFinite(v) && v >= 0) vscode.postMessage({ type: "setConfig", key: "ollama.numPredict", value: v });
  });
  document.querySelectorAll("button[data-action]").forEach((b) =>
    b.addEventListener("click", () => vscode.postMessage({ type: "runAction", action: b.dataset.action }))
  );
  $("settings").addEventListener("click", () => vscode.postMessage({ type: "openSettings" }));
  vscode.postMessage({ type: "ready" });
</script>
</body>
</html>`;
  }
}
