/**
 * Context Sufficiency Check — MURNI, deterministik.
 * Menjawab: "apakah file yang SUDAH dibaca cukup untuk goal ini,
 * atau ada file yang ADA di project tapi BELUM dibaca?"
 * Tidak pernah menebak isi file yang belum dibaca.
 */

export interface SufficiencyResult {
  confidence: "sufficient" | "insufficient";
  /** Path konkret (maks 4) yang ada tapi belum termasuk konteks. */
  missingContext: string[];
}

interface NeedRule {
  id: string;
  triggers: RegExp;
  patterns: RegExp[];
  label: string;
}

const NEED_RULES: NeedRule[] = [
  {
    id: "routes",
    triggers: /route|endpoint|api|url|halaman|page/i,
    patterns: [/\/routes\//, /routes\.\w+$/, /urls\.py$/, /router/i],
    label: "routes"
  },
  {
    id: "model",
    triggers: /model|database|tabel|table|entity|data/i,
    patterns: [/\/models?\//, /model\.\w+$/, /entities?\//, /schema/i],
    label: "model"
  },
  {
    id: "migration",
    triggers: /migra|database|tabel|table|skema|schema|kolom|column/i,
    patterns: [/\/migrations?\//, /alembic/],
    label: "migration"
  },
  {
    id: "controller",
    triggers: /controller|handler|endpoint|api|login|auth|register/i,
    patterns: [/\/controllers?\//, /\/handlers?\//, /views\.py$/],
    label: "controller/handler"
  },
  {
    id: "test",
    triggers: /test|testing|uji|\bspec\b/i,
    patterns: [
      /\/tests?\//,
      /\/__tests__\//,
      /\/spec\//,
      /\.test\.\w+$/,
      /\.spec\.\w+$/,
      /test_.*\.py$/
    ],
    label: "tests"
  },
  {
    id: "auth",
    triggers: /auth|login|register|sanctum|jwt|oauth|peran|\brole\b|admin/i,
    // Auth menyentuh vertical slice: controller + model + migration + routes.
    patterns: [/auth/i, /\/models?\//, /\/migrations?\//, /\/routes\//, /routes\.\w+$/],
    label: "auth (controller/model/migration/routes)"
  }
];

const MAX_MISSING = 4;

/**
 * @param goal          tujuan user (bahasa apapun)
 * @param includedPaths path yang SUDAH dibaca / dikirim sebagai konteks
 * @param candidates    seluruh path project yang boleh dibaca
 */
export function checkSufficiency(
  goal: string,
  includedPaths: string[],
  candidates: string[]
): SufficiencyResult {
  const included = new Set(includedPaths.map((p) => p.toLowerCase()));
  const missing: string[] = [];
  for (const rule of NEED_RULES) {
    if (!rule.triggers.test(goal)) {
      continue;
    }
    const matches = candidates.filter((c) =>
      rule.patterns.some((re) => re.test(c.toLowerCase()))
    );
    const notIncluded = matches.filter((m) => !included.has(m.toLowerCase()));
    for (const m of notIncluded.slice(0, 2)) {
      if (missing.length < MAX_MISSING && !missing.includes(m)) {
        missing.push(m);
      }
    }
  }
  return {
    confidence: missing.length === 0 ? "sufficient" : "insufficient",
    missingContext: missing
  };
}
