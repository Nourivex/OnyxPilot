import { describe, expect, it } from "vitest";
import { detectProject, formatProfile } from "./fingerprint";

const laravel = {
  files: {
    "composer.json": JSON.stringify({
      require: { php: "^8.2", "laravel/framework": "^11.0" }
    }),
    "package.json": JSON.stringify({ dependencies: { vue: "^3.0" } })
  },
  exists: ["artisan", "phpunit.xml", "package-lock.json"]
};

describe("detectProject", () => {
  it("Laravel terdeteksi deterministik", () => {
    const p = detectProject(laravel);
    expect(p).toMatchObject({
      framework: "Laravel",
      language: "PHP",
      languageVersion: "^8.2",
      frontend: "Vue",
      packageManager: "Composer + npm",
      testRunner: "PHPUnit",
      detected: true
    });
    expect(formatProfile(p)).toBe("Laravel • PHP ^8.2");
  });

  it("Node Express + npm + vitest", () => {
    const p = detectProject({
      files: {
        "package.json": JSON.stringify({
          dependencies: { express: "^4.0", pg: "^8.0" },
          devDependencies: { vitest: "^2.0", typescript: "^5.0" }
        })
      },
      exists: ["package-lock.json"]
    });
    expect(p).toMatchObject({
      framework: "Express",
      language: "TypeScript",
      database: "PostgreSQL",
      packageManager: "npm",
      testRunner: "Vitest",
      detected: true
    });
  });

  it("Unknown bila tak cocok — jangan menebak", () => {
    const p = detectProject({ files: {}, exists: ["notes.txt"] });
    expect(p.detected).toBe(false);
    expect(p.framework).toBe("Unknown");
    expect(formatProfile(p)).toBe("Unknown • Unknown");
  });

  it("JSON rusak tidak meledak", () => {
    const p = detectProject({ files: { "package.json": "{oops" }, exists: [] });
    expect(p.framework).toBe("Node.js");
    expect(p.detected).toBe(true);
  });

  it("Go + Django terdeteksi", () => {
    expect(
      detectProject({ files: { "go.mod": "module x\nrequire gin-gonic/gin" }, exists: [] })
        .framework
    ).toBe("Gin");
    expect(
      detectProject({ files: { "requirements.txt": "django==5.0\npytest" }, exists: ["manage.py"] })
        .framework
    ).toBe("Django");
  });
});
