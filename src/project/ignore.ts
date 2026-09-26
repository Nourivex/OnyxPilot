/**
 * Aturan file yang TIDAK BOLEH dibaca agent — MURNI, tanpa `vscode`.
 * Prinsip: whitelist akses, bukan blacklist belaka. Secrets tidak pernah
 * dikirim ke LLM dalam kondisi apapun.
 */

/** Direktori yang selalu dikecualikan (cocok sebagai segmen path). */
export const DENIED_DIRS = new Set([
  "node_modules",
  "vendor",
  ".git",
  "dist",
  "out",
  ".vscode-test",
  "storage",
  "__pycache__",
  ".venv",
  "venv",
  "target",
  "build",
  ".next",
  ".nuxt",
  "coverage"
]);

/** File rahasia / kredensial (cocok nama file persis atau pola). */
export const DENIED_FILES = new Set([".env"]);

const SECRET_PATTERNS = [/^\.env(\..+)?$/, /\.pem$/, /\.key$/, /\.p12$/, /\.pfx$/];

/** Ekstensi binary yang tidak berguna sebagai konteks kode. */
const BINARY_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".mp3", ".mp4", ".wav", ".ogg", ".mov", ".avi",
  ".zip", ".tar", ".gz", ".7z", ".rar",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".ttf", ".otf", ".woff", ".woff2", ".eot",
  ".sqlite", ".db", ".lockb"
]);

/** Ukuran maksimum satu file yang boleh dibaca (100 KB). */
export const MAX_READ_BYTES = 100_000;

export type DenyReason =
  | "denied-dir"
  | "secret-file"
  | "binary"
  | "too-large"
  | "outside-workspace";

/** True bila ekstensi file tergolong binary. */
export function hasBinaryExt(relativePath: string): boolean {
  const base = relativePath.replace(/\\/g, "/").split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  const ext = dot === -1 ? "" : base.slice(dot).toLowerCase();
  return BINARY_EXTS.has(ext);
}

/** True bila path relatif TIDAK BOLEH dibaca. Cocok case-insensitive untuk dir. */
export function isDenied(relativePath: string): boolean {
  const rel = relativePath.replace(/\\/g, "/");
  const segments = rel.split("/").filter((s) => s.length > 0 && s !== ".");
  if (segments.some((s) => DENIED_DIRS.has(s.toLowerCase()))) {
    return true;
  }
  const base = segments[segments.length - 1] ?? "";
  if (DENIED_FILES.has(base)) {
    return true;
  }
  if (SECRET_PATTERNS.some((re) => re.test(base))) {
    return true;
  }
  return hasBinaryExt(base);
}

/** Validasi akhir sebelum baca: aturan ignore + ukuran + dalam workspace. */
export function checkReadable(
  relativePath: string,
  sizeBytes: number,
  insideWorkspace: boolean
): { ok: true } | { ok: false; reason: DenyReason } {
  if (!insideWorkspace) {
    return { ok: false, reason: "outside-workspace" };
  }
  if (isDenied(relativePath)) {
    const base = relativePath.split("/").pop() ?? "";
    if (DENIED_FILES.has(base) || SECRET_PATTERNS.some((re) => re.test(base))) {
      return { ok: false, reason: "secret-file" };
    }
    if (hasBinaryExt(base)) {
      return { ok: false, reason: "binary" };
    }
    return { ok: false, reason: "denied-dir" };
  }
  if (sizeBytes > MAX_READ_BYTES) {
    return { ok: false, reason: "too-large" };
  }
  return { ok: true };
}
