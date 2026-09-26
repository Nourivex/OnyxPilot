import { describe, expect, it } from "vitest";
import { checkSufficiency } from "./sufficiency";

const CANDIDATES = [
  "routes/api.php",
  "app/Http/Controllers/AuthController.php",
  "app/Models/User.php",
  "database/migrations/2024_users.php",
  "tests/Feature/AuthTest.php",
  "composer.json"
];

describe("checkSufficiency", () => {
  it("insufficient bila model+migration ada tapi belum dibaca", () => {
    const res = checkSufficiency(
      "Tambahkan role admin ke authentication",
      ["routes/api.php", "app/Http/Controllers/AuthController.php"],
      CANDIDATES
    );
    expect(res.confidence).toBe("insufficient");
    expect(res.missingContext).toContain("app/Models/User.php");
    expect(res.missingContext).toContain("database/migrations/2024_users.php");
  });

  it("sufficient bila semua kebutuhan sudah termasuk", () => {
    const res = checkSufficiency(
      "Tambahkan role admin ke authentication",
      [
        "routes/api.php",
        "app/Http/Controllers/AuthController.php",
        "app/Models/User.php",
        "database/migrations/2024_users.php",
        "tests/Feature/AuthTest.php"
      ],
      CANDIDATES
    );
    expect(res).toEqual({ confidence: "sufficient", missingContext: [] });
  });

  it("goal tanpa kebutuhan khusus → sufficient", () => {
    expect(
      checkSufficiency("jelaskan function ini", ["a.php"], CANDIDATES).confidence
    ).toBe("sufficient");
  });

  it("file tak ada di project tidak dituntut", () => {
    const res = checkSufficiency(
      "tambahkan migration baru",
      [],
      ["routes/api.php"]
    );
    expect(res.confidence).toBe("sufficient");
  });
});
