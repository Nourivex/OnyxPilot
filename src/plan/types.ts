/**
 * Tipe Plan — MURNI. Plan adalah RENCANA, bukan izin mengubah file.
 * Constitutional rule: planning does not imply permission to modify.
 */

export type PlanFileAction = "read" | "modify" | "create";

export interface PlanFile {
  path: string;
  action: PlanFileAction;
  reason: string;
}

export interface PlanStep {
  title: string;
}

export interface ValidationStep {
  /** Mis. "php artisan test", "npm run lint", "buka halaman login manual". */
  text: string;
}

export type PlanConfidence = "sufficient" | "insufficient";

export interface Plan {
  goal: string;
  currentState: string;
  files: PlanFile[];
  steps: PlanStep[];
  risks: string[];
  validation: ValidationStep[];
  /** Status kelengkapan konteks (diisi engine, BUKAN hasil tebak AI). */
  confidence: PlanConfidence;
  /** Path/pola yang ada di project tapi belum dibaca saat plan dibuat. */
  missingContext: string[];
}
