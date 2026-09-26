import { describe, expect, it } from "vitest";
import { pickRelevantFiles } from "./relevant";

const CANDIDATES = [
  "routes/api.php",
  "app/Http/Controllers/AuthController.php",
  "app/Models/User.php",
  "database/migrations/2024_create_users_table.php",
  "tests/Feature/AuthTest.php",
  "resources/css/app.css",
  "README.md"
];

describe("pickRelevantFiles", () => {
  it("query auth menemukan controller + test", () => {
    const res = pickRelevantFiles(
      CANDIDATES,
      "benerin authentication login",
      "DashboardController.php",
      "Auth::attempt",
      3
    );
    expect(res).toContain("app/Http/Controllers/AuthController.php");
    expect(res).toContain("tests/Feature/AuthTest.php");
    expect(res.length).toBeLessThanOrEqual(3);
  });

  it("query user menemukan model", () => {
    const res = pickRelevantFiles(CANDIDATES, "user login", "api.php", "", 3);
    expect(res).toContain("app/Models/User.php");
  });

  it("current file dikecualikan, css tidak relevan", () => {
    const res = pickRelevantFiles(CANDIDATES, "auth login", "api.php", "", 8);
    expect(res).not.toContain("routes/api.php");
    expect(res).not.toContain("resources/css/app.css");
    expect(res).not.toContain("README.md");
  });

  it("query tak cocok → kosong (jangan asal kirim)", () => {
    expect(pickRelevantFiles(CANDIDATES, "xyzqqq zzz", "api.php", "", 3)).toEqual([]);
  });
});
