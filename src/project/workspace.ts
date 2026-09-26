/**
 * Akses workspace yang aman — tipis di atas vscode API.
 * Semua keputusan boleh/tidak ada di `ignore.ts` (murni, ter-test).
 */
import * as vscode from "vscode";
import { checkReadable, isDenied } from "./ignore";
import { detectProject, type ProjectProfile } from "./fingerprint";

export const MAX_LIST_FILES = 2000;

/** Manifest yang dibaca isinya untuk fingerprint (kecil, aman). */
const MANIFEST_FILES = [
  "composer.json",
  "package.json",
  "go.mod",
  "Cargo.toml",
  "requirements.txt",
  "pyproject.toml"
];

/** Penanda keberadaan saja (tidak dibaca isinya). */
const MANIFEST_MARKERS = [
  "artisan",
  "manage.py",
  "phpunit.xml",
  "phpunit.xml.dist",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "poetry.lock"
];

export function activeFolder(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.[0];
}

function toRelative(baseFsPath: string, absFsPath: string): string | undefined {
  const norm = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "");
  const b = norm(baseFsPath);
  const a = norm(absFsPath);
  if (a === b) {
    return "";
  }
  if (!a.startsWith(b + "/")) {
    return undefined;
  }
  return a.slice(b.length + 1);
}

/** Daftar file project (relatif, lolos ignore). Dibatasi 2000 file. */
export async function listWorkspaceFiles(
  folder: vscode.WorkspaceFolder
): Promise<string[]> {
  const uris = await vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, "**/*"),
    "{**/node_modules/**,**/.git/**,**/vendor/**,**/dist/**,**/out/**,**/.vscode-test/**,**/storage/**,**/__pycache__/**,**/.venv/**,**/venv/**,**/target/**,**/build/**,**/.next/**,**/.nuxt/**,**/coverage/**}",
    MAX_LIST_FILES
  );
  const out: string[] = [];
  for (const u of uris) {
    const rel = toRelative(folder.uri.fsPath, u.fsPath);
    if (!rel || rel.length === 0 || isDenied(rel)) {
      continue;
    }
    out.push(rel);
  }
  return out;
}

/**
 * Baca satu file project. Mengembalikan null bila: di luar workspace,
 * kena ignore rules, terlalu besar, binary (sniff NUL), atau gagal baca.
 */
export async function readProjectFile(
  folder: vscode.WorkspaceFolder,
  relPath: string
): Promise<string | null> {
  const uri = vscode.Uri.joinPath(folder.uri, relPath);
  const inside = toRelative(folder.uri.fsPath, uri.fsPath) === relPath;
  let size = 0;
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    if (
      stat.type !== vscode.FileType.File &&
      stat.type !== vscode.FileType.Unknown
    ) {
      return null;
    }
    size = stat.size;
  } catch {
    return null;
  }
  if (!checkReadable(relPath, size, inside).ok) {
    return null;
  }
  let bytes: Uint8Array;
  try {
    bytes = await vscode.workspace.fs.readFile(uri);
  } catch {
    return null;
  }
  if (bytes.includes(0)) {
    return null;
  }
  return Buffer.from(bytes).toString("utf8");
}

async function existsIn(
  folder: vscode.WorkspaceFolder,
  relPath: string
): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder.uri, relPath));
    return true;
  } catch {
    return false;
  }
}

export interface ProjectScan {
  profile: ProjectProfile;
  candidates: string[];
}

/** Scan sekali jalan: fingerprint (manifest kecil) + kandidat file. */
export async function scanProject(
  folder: vscode.WorkspaceFolder
): Promise<ProjectScan> {
  const candidates = await listWorkspaceFiles(folder);
  const files: Record<string, string> = {};
  const exists: string[] = [];
  for (const name of [...MANIFEST_FILES, ...MANIFEST_MARKERS]) {
    if (MANIFEST_FILES.includes(name)) {
      const text = await readProjectFile(folder, name);
      if (text !== null) {
        files[name] = text.slice(0, 8000);
        exists.push(name);
        continue;
      }
    }
    if (await existsIn(folder, name)) {
      exists.push(name);
    }
  }
  return { profile: detectProject({ files, exists }), candidates };
}
