import * as vscode from "vscode";
import { getEditorContext, hasSelection } from "../context/editor-context";
import { normalizeUrl } from "../ai/http";
import { listOllamaModels, listOpenAIModels } from "../ai/models";
import { generateWithActiveProvider } from "../ai/index";
import { buildChatRequest, type ChatTurn } from "../agent/conversation";
import { buildContextBlock } from "../agent/context-pack";
import { applyBudget, DEFAULT_BUDGET } from "../project/budget";
import { pickRelevantFiles } from "../project/relevant";
import { formatProfile, type ProjectProfile } from "../project/fingerprint";
import { checkSufficiency } from "../plan/sufficiency";
import { buildPlanRequest, parsePlan } from "../plan/planner";
import type { Plan } from "../plan/types";
import {
  activeFolder,
  readProjectFile,
  scanProject,
  type ProjectScan
} from "../project/workspace";
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
    | "chatSend"
    | "chatClear"
    | "planBuild"
    | "planClear"
    | "openSettings";
  action?: ActionId;
  provider?: string;
  model?: string;
  key?: string;
  value?: boolean | number;
  text?: string;
  goal?: string;
}

export interface ChatMessage extends ChatTurn {
  contextLabel?: string;
}

/**
 * Sidebar OnyxPilot: Chat (read-only) + Plan/Build (segera) + Setup.
 * Chat TIDAK mengubah file — perubahan tetap lewat Improve/Create + Diff Preview.
 */
export class OnyxSidebarProvider implements vscode.WebviewViewProvider {
  static readonly viewId = "onyxPilot.sidebar";

  private view?: vscode.WebviewView;
  private models: string[] = [];
  private connected: boolean | null = null;
  private loadingModels = false;
  private chat: ChatMessage[] = [];
  private chatBusy = false;
  private projectCache: { key: string; scan: ProjectScan } | undefined;
  private plan: {
    plan: Plan;
    includedPaths: string[];
    extraReads: string[];
  } | null = null;
  private planBusy = false;
  private planNotice = "";

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
    void this.ensureProject().then(() => this.pushState());
  }

  /** Scan project (manifest kecil) sekali per folder; cache sampai folder berubah. */
  private async ensureProject(): Promise<ProjectScan | undefined> {
    const folder = activeFolder();
    if (!folder) {
      return undefined;
    }
    const key = folder.uri.toString();
    if (this.projectCache?.key !== key) {
      try {
        this.projectCache = { key, scan: await scanProject(folder) };
      } catch {
        return undefined;
      }
    }
    return this.projectCache.scan;
  }

  /** Dipanggil saat workspace folders berubah. */
  async rescanProject(): Promise<void> {
    this.projectCache = undefined;
    if (this.view) {
      await this.ensureProject();
      this.pushState();
    }
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

  /** Dorong state terbaru (dipanggil saat selection / config / chat berubah). */
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
    const profile: ProjectProfile | null =
      this.projectCache?.scan.profile ?? null;
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
          : null,
      chat: this.chat,
      chatBusy: this.chatBusy,
      project: profile,
      plan: this.plan,
      planBusy: this.planBusy,
      planNotice: this.planNotice
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
      case "chatSend":
        await this.chatSend(msg.text ?? "");
        break;
      case "chatClear":
        this.chat = [];
        this.pushState();
        break;
      case "planBuild":
        await this.planBuild(msg.goal ?? "");
        break;
      case "planClear":
        this.plan = null;
        this.planNotice = "";
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

  /** Satu putaran chat: project + selection + file + related files → provider. */
  private async chatSend(raw: string): Promise<void> {
    const input = raw.trim();
    if (input.length === 0 || this.chatBusy) {
      return;
    }
    const editor = vscode.window.activeTextEditor;
    const ctx = getEditorContext();
    const fileName =
      editor?.document.fileName.split(/[\\/]/).pop() ??
      editor?.document.fileName ??
      "";
    const folder = activeFolder();
    const scan = await this.ensureProject();
    const profile = scan?.profile;
    let related: Array<{ path: string; text: string }> = [];
    if (folder && scan) {
      const picked = pickRelevantFiles(
        scan.candidates,
        input,
        fileName,
        ctx?.selectedCode ?? "",
        DEFAULT_BUDGET.maxFiles
      );
      const rawFiles: Array<{ path: string; text: string }> = [];
      for (const p of picked) {
        const text = await readProjectFile(folder, p);
        if (text !== null && text.trim().length > 0) {
          rawFiles.push({ path: p, text });
        }
      }
      related = applyBudget(rawFiles).included;
    }
    const pack = buildContextBlock({
      selection: ctx ?? null,
      fileText: editor?.document.getText() ?? "",
      fileName,
      language: editor?.document.languageId ?? "",
      project:
        profile && profile.detected ? formatProfile(profile) : "",
      related
    });
    this.chat.push({ role: "user", text: input, contextLabel: pack.label });
    this.chatBusy = true;
    this.pushState();
    try {
      const res = await generateWithActiveProvider(
        buildChatRequest(this.chat.slice(0, -1), pack.block, input)
      );
      this.chat.push({ role: "assistant", text: res.text });
    } catch (err) {
      this.chat.push({
        role: "assistant",
        text: `Maaf, request gagal: ${err instanceof Error ? err.message : String(err)}`
      });
    }
    this.chatBusy = false;
    this.pushState();
  }

  /** Budget konteks khusus planning (lebih longgar dari chat). */
  private static readonly PLAN_BUDGET = {
    maxFiles: 8,
    maxCharsPerFile: 2000,
    maxTotalChars: 9000
  };

  /** Baca + budget daftar path (aman, ignore-checked). */
  private async readBudgeted(
    folder: vscode.WorkspaceFolder | undefined,
    paths: string[]
  ): Promise<Array<{ path: string; text: string }>> {
    if (!folder) {
      return [];
    }
    const raw: Array<{ path: string; text: string }> = [];
    for (const p of paths) {
      const text = await readProjectFile(folder, p);
      if (text !== null && text.trim().length > 0) {
        raw.push({ path: p, text });
      }
    }
    return applyBudget(raw, OnyxSidebarProvider.PLAN_BUDGET).included;
  }

  /**
   * Plan Engine v1: konteks → sufficiency → inspect-round (sekali) → plan.
   * TIDAK mengubah file. Tombol Build sengaja disabled sampai Phase 4.
   */
  private async planBuild(goalRaw: string): Promise<void> {
    const goal = goalRaw.trim();
    if (goal.length === 0 || this.planBusy) {
      return;
    }
    this.planBusy = true;
    this.planNotice = "";
    this.plan = null;
    this.pushState();
    try {
      const folder = activeFolder();
      const scan = await this.ensureProject();
      const editor = vscode.window.activeTextEditor;
      const ctx = getEditorContext();
      const fileName =
        editor?.document.fileName.split(/[\\/]/).pop() ??
        editor?.document.fileName ??
        "";
      const candidates = scan?.candidates ?? [];
      const manifest = candidates.find((p) =>
        /^(composer\.json|package\.json|go\.mod|Cargo\.toml)$/.test(p)
      );
      const picked = pickRelevantFiles(
        candidates,
        goal,
        fileName,
        ctx?.selectedCode ?? "",
        6
      ).filter((p) => p !== manifest);
      const ordered = [...(manifest ? [manifest] : []), ...picked];
      let included = await this.readBudgeted(folder, ordered);
      let suff = checkSufficiency(
        goal,
        included.map((i) => i.path),
        candidates
      );
      // Inspect-round: baca yang kurang (sekali), lalu cek ulang.
      let extraReads: string[] = [];
      if (suff.confidence === "insufficient" && folder) {
        const more = await this.readBudgeted(
          folder,
          suff.missingContext.slice(0, 2)
        );
        if (more.length > 0) {
          extraReads = more.map((m) => m.path);
          const merged = applyBudget(
            [...included, ...more],
            OnyxSidebarProvider.PLAN_BUDGET
          );
          included = merged.included;
          suff = checkSufficiency(
            goal,
            included.map((i) => i.path),
            candidates
          );
        }
      }
      const profile = scan?.profile;
      const projectLine =
        profile && profile.detected ? formatProfile(profile) : "Unknown";
      const pack = buildContextBlock({
        selection: ctx ?? null,
        fileText: editor?.document.getText() ?? "",
        fileName,
        language: editor?.document.languageId ?? "",
        project: projectLine,
        related: included
      });
      const res = await generateWithActiveProvider(
        buildPlanRequest(projectLine, goal, pack.block)
      );
      const plan = parsePlan(res.text, goal);
      plan.confidence = suff.confidence;
      plan.missingContext = suff.missingContext;
      this.plan = {
        plan,
        includedPaths: included.map((i) => i.path),
        extraReads
      };
    } catch (err) {
      this.planNotice = `Gagal menyusun plan: ${err instanceof Error ? err.message : String(err)}`;
    }
    this.planBusy = false;
    this.pushState();
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
  html, body { height: 100%; }
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); padding: 12px; margin: 0; display: flex; flex-direction: column; box-sizing: border-box; }
  h1 { font-size: 14px; margin: 0 0 8px; display: flex; align-items: center; gap: 6px; }
  .sub { font-size: 11px; opacity: .7; margin: -4px 0 8px; display: flex; align-items: center; gap: 6px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--vscode-descriptionForeground); flex: none; }
  .dot.ok { background: var(--vscode-testing-iconPassed, #4caf50); }
  .dot.err { background: var(--vscode-testing-iconFailed, #f44336); }
  .modelrow { display: flex; gap: 6px; margin-bottom: 8px; }
  .modelrow select { flex: 1; }
  select { background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 4px; padding: 6px; box-sizing: border-box; }
  .icon-btn { flex: none; padding: 6px 10px; cursor: pointer; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; }
  .tabs { display: flex; gap: 4px; margin-bottom: 8px; }
  .tabs button { flex: 1; padding: 7px 0; cursor: pointer; border: none; border-radius: 4px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  .tabs button.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .view { display: none; flex: 1; flex-direction: column; min-height: 0; }
  .view.active { display: flex; }
  #messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; min-height: 80px; margin-bottom: 8px; }
  .msg { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 8px; }
  .msg.user { background: var(--vscode-button-secondaryBackground); align-self: flex-end; max-width: 95%; }
  .msg.assistant { background: var(--vscode-sideBar-background); align-self: flex-start; max-width: 100%; }
  .who { font-size: 11px; opacity: .7; margin-bottom: 4px; }
  .chip { display: inline-block; font-size: 11px; opacity: .8; border: 1px solid var(--vscode-panel-border); border-radius: 10px; padding: 1px 8px; margin-bottom: 4px; }
  .body { white-space: pre-wrap; word-break: break-word; font-size: 12px; }
  .body pre { background: var(--vscode-textCodeBlock-background); padding: 8px; border-radius: 4px; overflow-x: auto; margin: 6px 0; }
  .composer { display: flex; gap: 6px; }
  .composer textarea { flex: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, var(--vscode-dropdown-border)); border-radius: 4px; padding: 6px; resize: none; font-family: inherit; font-size: 12px; }
  .composer button { flex: none; padding: 6px 12px; cursor: pointer; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; }
  .composer button:disabled { opacity: .45; cursor: default; }
  .rowbtns { display: flex; gap: 6px; margin-top: 6px; }
  .rowbtns button { flex: 1; padding: 7px 0; cursor: pointer; border: none; border-radius: 4px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
  .card { border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 10px; margin-bottom: 8px; font-size: 12px; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; opacity: .7; margin-bottom: 4px; }
  .hint { font-size: 11px; opacity: .7; margin-top: 6px; }
  details.setup { margin-top: 8px; font-size: 12px; }
  details.setup summary { cursor: pointer; opacity: .8; }
  .param-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 6px 0; }
  .param-row select, .param-row input { width: 110px; flex: none; }
  input[type="number"] { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 4px; padding: 6px; box-sizing: border-box; }
  .link { background: none; border: none; color: var(--vscode-textLink-foreground); cursor: pointer; padding: 4px 0; text-align: left; }
  .empty { opacity: .7; font-size: 12px; text-align: center; margin: auto 0; }
  #goal { width: 100%; box-sizing: border-box; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, var(--vscode-dropdown-border)); border-radius: 4px; padding: 6px; resize: none; font-family: inherit; font-size: 12px; }
  .badge { display: inline-block; font-size: 11px; border-radius: 10px; padding: 2px 10px; margin-bottom: 6px; }
  .badge.ok { background: var(--vscode-testing-iconPassed, #4caf50); color: #fff; }
  .badge.warn { background: var(--vscode-testing-iconFailed, #f44336); color: #fff; }
  .plansec { margin-bottom: 8px; }
  .plansec .body { font-size: 12px; }
  .filerow { display: flex; gap: 6px; align-items: baseline; font-size: 12px; margin-bottom: 4px; }
  .filerow code { flex: 1; word-break: break-all; }
  .act { flex: none; font-size: 10px; text-transform: uppercase; border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 0 6px; opacity: .9; }
  .act-modify { color: var(--vscode-testing-iconFailed, #f44336); }
  .act-create { color: var(--vscode-testing-iconPassed, #4caf50); }
  ol.plan, ul.plan { margin: 4px 0 4px 18px; padding: 0; font-size: 12px; }
  ol.plan li, ul.plan li { margin-bottom: 3px; }
  button:disabled { opacity: .45; cursor: default; }
</style>
</head>
<body>
  <h1>⚡ OnyxPilot</h1>
  <div class="sub"><span id="dot" class="dot"></span><span id="conn">…</span></div>

  <div class="modelrow">
    <select id="model"></select>
    <button id="refresh" class="icon-btn" title="Muat ulang daftar model dari server">⟳</button>
  </div>

  <div class="tabs">
    <button data-tab="chat" class="active">Chat</button>
    <button data-tab="plan">Plan</button>
    <button data-tab="build">Build</button>
  </div>

  <div id="view-chat" class="view active">
    <div id="messages"></div>
    <div class="composer">
      <textarea id="input" rows="2" placeholder="Ask Onyx… (Enter kirim, Shift+Enter baris baru)"></textarea>
      <button id="send">↵</button>
    </div>
    <div class="rowbtns"><button id="clear">Bersihkan chat</button></div>
  </div>

  <div id="view-plan" class="view">
    <div class="card">
      <div class="label">Goal</div>
      <textarea id="goal" rows="2" placeholder="cth: Tambahkan role admin ke authentication"></textarea>
      <div class="rowbtns"><button id="makeplan">Buat Plan</button></div>
      <div id="plannotice" class="hint"></div>
    </div>
    <div id="planout"></div>
  </div>

  <div id="view-build" class="view">
    <div class="card">
      <div class="label">Build engine — segera</div>
      <div>Menjalankan plan yang disetujui langkah demi langkah (read → edit → test) dengan approval per perubahan. Sementara itu:</div>
      <div class="rowbtns"><button data-action="improve">✨ Improve selection</button></div>
      <div class="hint">Improve selalu lewat Diff Preview + Apply/Reject.</div>
    </div>
  </div>

  <details class="setup">
    <summary>Setup: provider, parameter, selection</summary>
    <div class="param-row"><span>Provider</span><select id="provider" style="width:150px;flex:none">
      <option value="ollama">Ollama (lokal)</option>
      <option value="openai-compatible">OpenAI-compatible</option>
    </select></div>
    <div id="params">
      <div class="param-row"><span>Think</span><select id="think"><option value="true">On</option><option value="false">Off</option></select></div>
      <div class="param-row"><span>Temperature</span><input id="temp" type="number" min="0" max="2" step="0.1"></div>
      <div class="param-row"><span>Max tokens</span><input id="maxtok" type="number" min="0" step="128"></div>
    </div>
    <div id="sel" class="hint">—</div>
    <div id="endpoint" class="hint"></div>
    <button id="settings" class="link">⚙ Settings</button>
  </details>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);
  const dotEl = $("dot"), connEl = $("conn"), modelEl = $("model"),
        refreshBtn = $("refresh"), providerEl = $("provider"),
        thinkEl = $("think"), tempEl = $("temp"), maxtokEl = $("maxtok"),
        selEl = $("sel"), endpointEl = $("endpoint"),
        messagesEl = $("messages"), inputEl = $("input"), sendBtn = $("send");

  document.querySelectorAll(".tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      $("view-" + b.dataset.tab).classList.add("active");
    })
  );

  function renderBody(container, text) {
    container.textContent = "";
    // Pisah fence kode jadi <pre> agar jawaban ber-kode mudah dibaca (via DOM API).
    // FENCE dirakit dari charcode agar backtick tidak menutup template literal TS.
    const FENCE = String.fromCharCode(96, 96, 96);
    const parts = String(text).split(FENCE);
    parts.forEach((part, i) => {
      if (i % 2 === 1) {
        const pre = document.createElement("pre");
        pre.textContent = part.replace(/^[a-zA-Z+-]+\\n/, "");
        container.appendChild(pre);
      } else if (part.length > 0) {
        const div = document.createElement("div");
        div.textContent = part;
        container.appendChild(div);
      }
    });
  }

  function renderChat(chat, busy) {
    messagesEl.textContent = "";
    if (chat.length === 0) {
      const d = document.createElement("div");
      d.className = "empty";
      d.textContent = "Blok kode lalu tanya, mis. \\"kenapa function ini error?\\" — Onyx melihat selection + file aktif.";
      messagesEl.appendChild(d);
    }
    for (const m of chat) {
      const wrap = document.createElement("div");
      wrap.className = "msg " + (m.role === "user" ? "user" : "assistant");
      const who = document.createElement("div");
      who.className = "who";
      who.textContent = m.role === "user" ? "You" : "Onyx";
      wrap.appendChild(who);
      if (m.role === "user" && m.contextLabel) {
        const chip = document.createElement("div");
        chip.innerHTML = "";
        const c = document.createElement("span");
        c.className = "chip";
        c.textContent = "📎 " + m.contextLabel;
        chip.appendChild(c);
        wrap.appendChild(chip);
      }
      const body = document.createElement("div");
      body.className = "body";
      renderBody(body, m.text);
      wrap.appendChild(body);
      messagesEl.appendChild(wrap);
    }
    if (busy) {
      const w = document.createElement("div");
      w.className = "msg assistant";
      const b = document.createElement("div");
      b.className = "body";
      b.textContent = "Berpikir…";
      w.appendChild(b);
      messagesEl.appendChild(w);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
    sendBtn.disabled = busy;
    inputEl.disabled = busy;
  }

  window.addEventListener("message", (e) => {
    const s = e.data;
    if (!s || s.type !== "state") return;
    providerEl.value = s.provider;
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
    const projLabel = s.project && s.project.detected
      ? s.project.framework + " • " + s.project.language
      : (s.provider === "ollama" ? "Ollama" : "OpenAI-compatible");
    if (s.connected === true) {
      dotEl.className = "dot ok";
      connEl.textContent = projLabel + " • Connected";
    } else if (s.connected === false) {
      dotEl.className = "dot err";
      connEl.textContent = "Offline";
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
      ? "Selection: " + s.selection.lines + " baris • " + s.selection.fileName
      : "Tidak ada selection";
    refreshBtn.disabled = s.loadingModels;
    renderChat(s.chat || [], s.chatBusy);
    renderPlan(s.plan || null, !!s.planBusy, s.planNotice || "");
  });

  function send() {
    const v = inputEl.value;
    if (!v || !v.trim()) return;
    inputEl.value = "";
    vscode.postMessage({ type: "chatSend", text: v });
  }

  function section(parent, label, lines, ordered) {
    if (!lines || lines.length === 0) return;
    const sec = document.createElement("div");
    sec.className = "plansec";
    const h = document.createElement("div");
    h.className = "label";
    h.textContent = label;
    sec.appendChild(h);
    const list = document.createElement(ordered ? "ol" : "ul");
    list.className = "plan";
    for (const t of lines) {
      const li = document.createElement("li");
      li.textContent = typeof t === "string" ? t : (t.title || t.text || "");
      list.appendChild(li);
    }
    sec.appendChild(list);
    parent.appendChild(sec);
  }

  function renderPlan(pv, busy, notice) {
    $("plannotice").textContent = notice || "";
    $("makeplan").disabled = busy;
    const out = $("planout");
    out.textContent = "";
    if (busy) {
      const d = document.createElement("div");
      d.className = "card";
      d.textContent = "Menyusun plan… (baca konteks → cek cukup → minta AI)";
      out.appendChild(d);
      return;
    }
    if (!pv) return;
    const p = pv.plan;
    const card = document.createElement("div");
    card.className = "card";
    const badge = document.createElement("div");
    badge.className = "badge " + (p.confidence === "sufficient" ? "ok" : "warn");
    badge.textContent = p.confidence === "sufficient" ? "Konteks cukup" : "Konteks belum cukup";
    card.appendChild(badge);
    if (p.missingContext && p.missingContext.length > 0) {
      const miss = document.createElement("div");
      miss.className = "hint";
      miss.textContent = "Belum dibaca: " + p.missingContext.join(", ");
      card.appendChild(miss);
    }
    if (pv.extraReads && pv.extraReads.length > 0) {
      const ex = document.createElement("div");
      ex.className = "hint";
      ex.textContent = "Dibaca otomatis: " + pv.extraReads.join(", ");
      card.appendChild(ex);
    }
    const goal = document.createElement("div");
    goal.className = "plansec";
    const gl = document.createElement("div");
    gl.className = "label";
    gl.textContent = "Goal";
    goal.appendChild(gl);
    const gb = document.createElement("div");
    gb.className = "body";
    gb.textContent = p.goal;
    goal.appendChild(gb);
    card.appendChild(goal);
    if (p.currentState) {
      const cs = document.createElement("div");
      cs.className = "plansec";
      const cl = document.createElement("div");
      cl.className = "label";
      cl.textContent = "Current state";
      cs.appendChild(cl);
      const cb = document.createElement("div");
      cb.className = "body";
      cb.textContent = p.currentState;
      cs.appendChild(cb);
      card.appendChild(cs);
    }
    if (p.files && p.files.length > 0) {
      const fs = document.createElement("div");
      fs.className = "plansec";
      const fl = document.createElement("div");
      fl.className = "label";
      fl.textContent = "Files";
      fs.appendChild(fl);
      for (const f of p.files) {
        const row = document.createElement("div");
        row.className = "filerow";
        const code = document.createElement("code");
        code.textContent = f.path + (f.reason ? " — " + f.reason : "");
        row.appendChild(code);
        const act = document.createElement("span");
        act.className = "act act-" + f.action;
        act.textContent = f.action;
        row.appendChild(act);
        fs.appendChild(row);
      }
      card.appendChild(fs);
    }
    section(card, "Steps", p.steps, true);
    section(card, "Risks", p.risks, false);
    section(card, "Validation", p.validation, false);
    const ctx = document.createElement("div");
    ctx.className = "hint";
    ctx.textContent = "Konteks: " + (pv.includedPaths.length > 0 ? pv.includedPaths.join(", ") : "—");
    card.appendChild(ctx);
    const btns = document.createElement("div");
    btns.className = "rowbtns";
    const rebuild = document.createElement("button");
    rebuild.textContent = "Buat ulang";
    rebuild.addEventListener("click", () => vscode.postMessage({ type: "planBuild", goal: $("goal").value }));
    btns.appendChild(rebuild);
    const clear = document.createElement("button");
    clear.textContent = "Hapus";
    clear.addEventListener("click", () => vscode.postMessage({ type: "planClear" }));
    btns.appendChild(clear);
    card.appendChild(btns);
    const buildRow = document.createElement("div");
    buildRow.className = "rowbtns";
    const build = document.createElement("button");
    build.textContent = "Setujui & Build (Phase 4)";
    build.disabled = true;
    build.title = "Build engine hadir di Phase 4 — plan tidak mengubah file apapun";
    buildRow.appendChild(build);
    card.appendChild(buildRow);
    out.appendChild(card);
  }
  sendBtn.addEventListener("click", send);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });
  $("clear").addEventListener("click", () => vscode.postMessage({ type: "chatClear" }));
  $("makeplan").addEventListener("click", () => vscode.postMessage({ type: "planBuild", goal: $("goal").value }));
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
