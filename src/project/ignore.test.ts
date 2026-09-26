import { describe, expect, it } from "vitest";
import { checkReadable, isDenied } from "./ignore";

describe("isDenied", () => {
  it("secrets tidak pernah boleh dibaca", () => {
    expect(isDenied(".env")).toBe(true);
    expect(isDenied(".env.production")).toBe(true);
    expect(isDenied("config/.env.local")).toBe(true);
    expect(isDenied("private-key.pem")).toBe(true);
    expect(isDenied("certs/server.key")).toBe(true);
  });

  it("direktori berat/privat dikecualikan", () => {
    expect(isDenied("node_modules/express/index.js")).toBe(true);
    expect(isDenied("vendor/laravel/app.php")).toBe(true);
    expect(isDenied(".git/config")).toBe(true);
    expect(isDenied("storage/logs/laravel.log")).toBe(true);
  });

  it("binary ditolak", () => {
    expect(isDenied("logo.png")).toBe(true);
    expect(isDenied("doc.pdf")).toBe(true);
    expect(isDenied("app.db")).toBe(true);
  });

  it("kode sumber lolos", () => {
    expect(isDenied("app/Http/Controllers/AuthController.php")).toBe(false);
    expect(isDenied("routes/api.php")).toBe(false);
    expect(isDenied("composer.json")).toBe(false);
    expect(isDenied("tests/Feature/AuthTest.php")).toBe(false);
  });
});

describe("checkReadable", () => {
  it("di luar workspace selalu ditolak", () => {
    expect(checkReadable("a.php", 10, false)).toEqual({
      ok: false,
      reason: "outside-workspace"
    });
  });

  it("file raksasa ditolak", () => {
    expect(checkReadable("big.php", 100_001, true)).toEqual({
      ok: false,
      reason: "too-large"
    });
  });

  it("alasan secret vs dir dibedakan", () => {
    expect(checkReadable(".env", 10, true)).toEqual({
      ok: false,
      reason: "secret-file"
    });
    expect(checkReadable("node_modules/x.js", 10, true)).toEqual({
      ok: false,
      reason: "denied-dir"
    });
    expect(checkReadable("a.php", 10, true)).toEqual({ ok: true });
  });
});
