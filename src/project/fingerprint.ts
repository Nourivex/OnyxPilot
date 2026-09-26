/**
 * Deteksi project dari file manifest — MURNI, deterministik, tanpa `vscode`.
 * Prinsip: JANGAN menebak. Tidak cocok aturan apapun → framework "Unknown".
 */
export interface ProjectProfile {
  /** Mis. "Laravel", "Express", "Unknown". */
  framework: string;
  frameworkVersion?: string;
  /** Mis. "PHP", "TypeScript". */
  language: string;
  languageVersion?: string;
  database: string;
  frontend?: string;
  packageManager?: string;
  testRunner?: string;
  detected: boolean;
}

export interface ManifestSnapshot {
  /** path relatif -> isi (sudah dibatasi ukuran oleh pemanggil). */
  files: Record<string, string>;
  /** path relatif yang ADA (termasuk file kosong penanda). */
  exists: string[];
}

const UNKNOWN: ProjectProfile = {
  framework: "Unknown",
  language: "Unknown",
  database: "Unknown",
  detected: false
};

function parseJson(text: string): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(text);
    return typeof v === "object" && v !== null
      ? (v as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function depBag(pkg: Record<string, unknown>): Set<string> {
  const bag = new Set<string>();
  for (const key of ["dependencies", "devDependencies", "require", "require-dev"]) {
    const section = pkg[key];
    if (typeof section === "object" && section !== null) {
      for (const name of Object.keys(section as Record<string, unknown>)) {
        bag.add(name.toLowerCase());
      }
    }
  }
  return bag;
}

function str(pkg: Record<string, unknown>, path: string[]): string | undefined {
  let cur: unknown = pkg;
  for (const p of path) {
    if (typeof cur !== "object" || cur === null) {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

function detectDatabase(bag: Set<string>): string {
  const names = [...bag].join(" ");
  if (/pg|postgres|pgsql|typeorm|prisma|sequelize|drizzle|knex/.test(names)) {
    if (/mongodb|mongoose/.test(names)) {
      return "PostgreSQL + MongoDB";
    }
    return names.includes("mysql") || names.includes("mariadb")
      ? "MySQL/MariaDB + PostgreSQL?"
      : "PostgreSQL";
  }
  if (/mysql|mariadb/.test(names)) {
    return "MySQL/MariaDB";
  }
  if (/sqlite|better-sqlite3/.test(names)) {
    return "SQLite";
  }
  if (/mongodb|mongoose/.test(names)) {
    return "MongoDB";
  }
  return "Unknown";
}

/** Tampilkan ringkas untuk UI/chat: "Laravel • PHP 8.2". */
export function formatProfile(p: ProjectProfile): string {
  const fw = p.frameworkVersion ? `${p.framework} ${p.frameworkVersion}` : p.framework;
  const lang = p.languageVersion ? `${p.language} ${p.languageVersion}` : p.language;
  return `${fw} • ${lang}`;
}

export function detectProject(snap: ManifestSnapshot): ProjectProfile {
  const files = snap.files;
  const exists = new Set(snap.exists.map((p) => p.replace(/\\/g, "/")));

  // --- Laravel (PHP) ---
  if (files["composer.json"] !== undefined || exists.has("artisan")) {
    const composer = parseJson(files["composer.json"] ?? "{}");
    const bag = depBag(composer);
    const isLaravel =
      [...bag].some((d) => d.startsWith("laravel/")) || exists.has("artisan");
    if (isLaravel) {
      let frontend = "Blade";
      if (files["package.json"] !== undefined) {
        const pkg = parseJson(files["package.json"]);
        const js = depBag(pkg);
        if ([...js].some((d) => d === "vue" || d.startsWith("@vue/"))) {
          frontend = "Vue";
        } else if ([...js].some((d) => d === "react" || d === "react-dom")) {
          frontend = "React";
        }
      }
      return {
        framework: "Laravel",
        language: "PHP",
        languageVersion: str(composer, ["require", "php"]),
        database: detectDatabase(bag),
        frontend,
        packageManager: "Composer" + (files["package.json"] !== undefined ? " + npm" : ""),
        testRunner: exists.has("phpunit.xml") || exists.has("phpunit.xml.dist")
          ? "PHPUnit"
          : bag.has("pestphp/pest")
            ? "Pest"
            : "Unknown",
        detected: true
      };
    }
  }

  // --- Node.js ---
  if (files["package.json"] !== undefined) {
    const pkg = parseJson(files["package.json"]);
    const bag = depBag(pkg);
    const names = [...bag];
    let framework = "Node.js";
    if (names.some((d) => d === "next" || d.startsWith("next/"))) {
      framework = "Next.js";
    } else if (names.some((d) => d.startsWith("@nestjs/"))) {
      framework = "NestJS";
    } else if (names.some((d) => d === "express")) {
      framework = "Express";
    } else if (names.some((d) => d === "react" || d === "react-dom")) {
      framework = "React";
    } else if (names.some((d) => d === "vue" || d.startsWith("@vue/"))) {
      framework = "Vue";
    }
    const isTs =
      bag.has("typescript") ||
      str(pkg, ["devDependencies", "typescript"]) !== undefined;
    return {
      framework,
      language: isTs ? "TypeScript" : "JavaScript",
      database: detectDatabase(bag),
      packageManager: exists.has("pnpm-lock.yaml")
        ? "pnpm"
        : exists.has("bun.lockb") || exists.has("bun.lock")
          ? "bun"
          : exists.has("package-lock.json")
            ? "npm"
            : exists.has("yarn.lock")
              ? "yarn"
              : "npm?",
      testRunner: bag.has("vitest")
        ? "Vitest"
        : bag.has("jest")
          ? "Jest"
          : bag.has("mocha")
            ? "Mocha"
            : bag.has("playwright") || bag.has("@playwright/test")
              ? "Playwright"
              : "Unknown",
      detected: true
    };
  }

  // --- Python ---
  const pyText = [files["requirements.txt"], files["pyproject.toml"]]
    .filter((t) => t !== undefined)
    .join("\n")
    .toLowerCase();
  if (pyText.length > 0 || exists.has("manage.py")) {
    let framework = "Python";
    if (pyText.includes("django") || exists.has("manage.py")) {
      framework = "Django";
    } else if (pyText.includes("fastapi")) {
      framework = "FastAPI";
    } else if (pyText.includes("flask")) {
      framework = "Flask";
    }
    return {
      framework,
      language: "Python",
      database: detectDatabase(new Set(pyText.split(/[^a-z0-9_/-]+/))),
      packageManager: exists.has("poetry.lock") ? "Poetry" : "pip",
      testRunner: pyText.includes("pytest") ? "pytest" : "Unknown",
      detected: framework !== "Python"
    };
  }

  // --- Go ---
  if (files["go.mod"] !== undefined) {
    const mod = files["go.mod"].toLowerCase();
    const fw = mod.includes("gin-gonic/gin")
      ? "Gin"
      : mod.includes("labstack/echo")
        ? "Echo"
        : mod.includes("gofiber/fiber")
          ? "Fiber"
          : "Go";
    return {
      framework: fw,
      language: "Go",
      database: detectDatabase(new Set(mod.split(/[^a-z0-9_/-]+/))),
      packageManager: "Go modules",
      testRunner: "go test",
      detected: true
    };
  }

  // --- Rust ---
  if (files["Cargo.toml"] !== undefined) {
    const cargo = files["Cargo.toml"].toLowerCase();
    const fw = cargo.includes("axum")
      ? "Axum"
      : cargo.includes("actix")
        ? "Actix"
        : cargo.includes("rocket")
          ? "Rocket"
          : "Rust";
    return {
      framework: fw,
      language: "Rust",
      database: "Unknown",
      packageManager: "Cargo",
      testRunner: "cargo test",
      detected: true
    };
  }

  return { ...UNKNOWN };
}
