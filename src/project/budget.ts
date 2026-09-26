/**
 * Context budget — MURNI. Jangan kirim seluruh project ke LLM.
 * Urutan prioritas penentu (pertama = terpenting), potong per-file + total.
 */

export interface BudgetedFile {
  path: string;
  text: string;
}

export interface BudgetLimits {
  maxFiles: number;
  maxCharsPerFile: number;
  maxTotalChars: number;
}

export const DEFAULT_BUDGET: BudgetLimits = {
  maxFiles: 3,
  maxCharsPerFile: 1500,
  maxTotalChars: 4500
};

export interface BudgetResult {
  included: BudgetedFile[];
  /** Path yang dibuang karena budget habis. */
  dropped: string[];
  truncated: boolean;
}

export function applyBudget(
  files: BudgetedFile[],
  limits: BudgetLimits = DEFAULT_BUDGET
): BudgetResult {
  const included: BudgetedFile[] = [];
  const dropped: string[] = [];
  let total = 0;
  let truncated = false;
  for (const f of files.slice(0, limits.maxFiles)) {
    if (included.length >= limits.maxFiles) {
      break;
    }
    let text = f.text;
    if (text.length > limits.maxCharsPerFile) {
      text = text.slice(0, limits.maxCharsPerFile) + "\n…[dipotong]";
      truncated = true;
    }
    if (total + text.length > limits.maxTotalChars && included.length > 0) {
      dropped.push(f.path);
      truncated = true;
      continue;
    }
    included.push({ path: f.path, text });
    total += text.length;
  }
  for (const f of files.slice(limits.maxFiles)) {
    dropped.push(f.path);
  }
  if (dropped.length > 0) {
    truncated = true;
  }
  return { included, dropped, truncated };
}
