import { describe, expect, it } from "vitest";
import { buildEditorContext } from "../context/context-types";
import {
  buildAudit,
  buildCreate,
  buildExplain,
  buildImprove
} from "./prompt-builder";

const ctx = buildEditorContext("typescript", "a.ts", "const x = 1;", 0, 0);

describe("prompt-builder", () => {
  it("audit memuat aturan reviewer", () => {
    const req = buildAudit(ctx);
    expect(req.system).toContain("code reviewer");
    expect(req.user).toContain("const x = 1;");
  });

  it("improve/explain/create memuat konteks", () => {
    expect(buildImprove(ctx).user).toContain("typescript");
    expect(buildExplain(ctx).system).toContain("Explain");
    expect(buildCreate(ctx, "buat retry").user).toContain("buat retry");
  });

  it("improve dengan focus menempel Focus", () => {
    const req = buildImprove(ctx, "jadikan OOP");
    expect(req.user).toContain("Focus:\njadikan OOP");
  });

  it("improve tanpa focus = perilaku lama", () => {
    expect(buildImprove(ctx).user).not.toContain("Focus:");
    expect(buildImprove(ctx, "   ").user).not.toContain("Focus:");
  });
});
