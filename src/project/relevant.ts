/**
 * Pilih file relevan secara heuristik deterministik — MURNI, tanpa LLM.
 * Skor dari kecocokan token query + nama file selection + direktori penting.
 * Bukan pengganti retrieval canggih; cukup untuk Phase 2 yang transparan.
 */

const IMPORTANT_DIRS = [
  "routes",
  "controllers",
  "models",
  "middleware",
  "migrations",
  "services",
  "tests",
  "test",
  "api",
  "src",
  "lib",
  "config"
];

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

/** Skor satu path terhadap token query + konteks file aktif.
 * Nol bila tak ada kecocokan token — direktori penting hanya bonus,
 * bukan alasan mengirim file yang tidak relevan. */
export function scorePath(
  relPath: string,
  queryTokens: string[],
  contextTokens: string[]
): number {
  const lower = relPath.toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (lower.includes(t)) {
      score += lower.split("/").pop()?.includes(t) ? 3 : 1;
    } else if (t.length >= 5 && lower.includes(t.slice(0, 4))) {
      // stemming kasar: "authentication" cocok dengan auth* (authcontroller, auth.php)
      score += 1;
    }
  }
  for (const t of contextTokens) {
    if (t.length >= 4 && lower.includes(t)) {
      score += 2;
    }
  }
  if (score === 0) {
    return 0;
  }
  const segments = lower.split("/");
  if (segments.some((s) => IMPORTANT_DIRS.includes(s))) {
    score += 1;
  }
  return score;
}

/**
 * Ambil top-N path relevan. Asumsi candidates SUDAH lolos ignore rules.
 * currentFile dikecualikan (sudah dikirim sebagai current file).
 */
export function pickRelevantFiles(
  candidates: string[],
  query: string,
  currentFileBase: string,
  selectionText: string,
  topN: number
): string[] {
  const queryTokens = tokens(query);
  const contextTokens = [
    ...tokens(currentFileBase.replace(/\.[a-z0-9]+$/i, "")),
    ...tokens(selectionText).slice(0, 12)
  ];
  const cur = currentFileBase.toLowerCase();
  const scored = candidates
    .filter((c) => c.toLowerCase() !== cur && !c.toLowerCase().endsWith("/" + cur))
    .map((c) => ({ path: c, score: scorePath(c, queryTokens, contextTokens) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.path.length - b.path.length);
  return scored.slice(0, Math.max(0, topN)).map((s) => s.path);
}
