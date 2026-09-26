import { describe, expect, it } from "vitest";
import { buildPlanRequest, parsePlan } from "./planner";

const SAMPLE = `# GOAL
Tambah role admin

# CURRENT STATE
AuthController ada, User model ada.

# FILES
- app/Models/User.php | modify | tambah kolom role
- routes/api.php | modify | tambah route admin
- tests/Feature/AuthTest.php | create | test role

# STEPS
1. Baca User.php
2. Tambah kolom role
3. Tambah route

# RISKS
- Auth lama bisa konflik

# VALIDATION
- php artisan test
`;

describe("buildPlanRequest", () => {
  it("header tepat + bahasa Indonesia", () => {
    const req = buildPlanRequest("Laravel • PHP", "tambah admin", "CTX");
    expect(req.system).toContain("# FILES");
    expect(req.system).toContain("Bahasa Indonesia");
    expect(req.system).toContain("does not imply permission");
    expect(req.user).toContain("[Goal]\ntambah admin");
  });
});

describe("parsePlan", () => {
  it("parse lengkap", () => {
    const p = parsePlan(SAMPLE, "tambah admin");
    expect(p.goal).toBe("tambah admin");
    expect(p.currentState).toContain("User model ada");
    expect(p.files).toEqual([
      { path: "app/Models/User.php", action: "modify", reason: "tambah kolom role" },
      { path: "routes/api.php", action: "modify", reason: "tambah route admin" },
      { path: "tests/Feature/AuthTest.php", action: "create", reason: "test role" }
    ]);
    expect(p.steps.map((s) => s.title)).toEqual([
      "Baca User.php",
      "Tambah kolom role",
      "Tambah route"
    ]);
    expect(p.risks).toEqual(["Auth lama bisa konflik"]);
    expect(p.validation).toEqual([{ text: "php artisan test" }]);
  });

  it("toleran: section hilang / format aneh", () => {
    const p = parsePlan("ngawur tanpa header", "g");
    expect(p).toMatchObject({
      goal: "g",
      currentState: "",
      files: [],
      steps: [],
      risks: [],
      validation: []
    });
    const p2 = parsePlan("# FILES\n- a.php | hapus | x\n- b.php", "g");
    expect(p2.files).toEqual([
      { path: "a.php", action: "read", reason: "x" },
      { path: "b.php", action: "read", reason: "" }
    ]);
  });
});
