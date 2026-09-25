import { describe, expect, it } from "vitest";
import { buildEditorContext, hasSelection } from "./context-types";

describe("buildEditorContext", () => {
  it("mengembalikan object context sesuai plan 03", () => {
    const ctx = buildEditorContext(
      "typescript",
      "auth.service.ts",
      "const x = 1;",
      12,
      27
    );
    expect(ctx).toEqual({
      language: "typescript",
      fileName: "auth.service.ts",
      selectedCode: "const x = 1;",
      startLine: 12,
      endLine: 27
    });
  });
});

describe("hasSelection", () => {
  it("false bila context undefined atau selection kosong", () => {
    expect(hasSelection(undefined)).toBe(false);
    expect(hasSelection(buildEditorContext("ts", "a.ts", "   ", 0, 0))).toBe(
      false
    );
  });

  it("true bila ada kode terpilih", () => {
    expect(
      hasSelection(buildEditorContext("ts", "a.ts", "const x = 1;", 0, 0))
    ).toBe(true);
  });
});
