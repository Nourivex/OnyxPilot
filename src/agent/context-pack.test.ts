import { describe, expect, it } from "vitest";
import { buildEditorContext } from "../context/context-types";
import { buildContextBlock, MAX_FILE_CHARS } from "./context-pack";

describe("buildContextBlock", () => {
  it("selection + file digabung + label", () => {
    const pack = buildContextBlock({
      selection: buildEditorContext("php", "api.php", "echo 1;", 11, 14),
      fileText: "<?php\necho 1;",
      fileName: "api.php",
      language: "php"
    });
    expect(pack.block).toContain("[Selection: api.php lines 12-15 (php)]");
    expect(pack.block).toContain("[Current file: api.php (php)]");
    expect(pack.label).toBe("4 baris • api.php");
  });

  it("tanpa selection: hanya file", () => {
    const pack = buildContextBlock({
      selection: null,
      fileText: "x",
      fileName: "a.ts",
      language: "typescript"
    });
    expect(pack.block).toContain("[Current file: a.ts");
    expect(pack.label).toBe("file a.ts");
  });

  it("file panjang dipotong", () => {
    const pack = buildContextBlock({
      selection: null,
      fileText: "z".repeat(MAX_FILE_CHARS + 10),
      fileName: "big.ts",
      language: "typescript"
    });
    expect(pack.block).toContain("[dipotong]");
  });

  it("tanpa editor", () => {
    expect(
      buildContextBlock({ selection: null, fileText: "", fileName: "", language: "" })
    ).toEqual({ block: "(no editor open)", label: "tidak ada editor" });
  });

  it("project + related masuk blok + label", () => {
    const pack = buildContextBlock({
      selection: buildEditorContext("php", "api.php", "echo 1;", 0, 0),
      fileText: "",
      fileName: "api.php",
      language: "php",
      project: "Laravel • PHP 8.2",
      related: [{ path: "app/Models/User.php", text: "class User {}" }]
    });
    expect(pack.block).toContain("[Project: Laravel • PHP 8.2]");
    expect(pack.block).toContain("[Related: app/Models/User.php]");
    expect(pack.label).toBe("1 baris • api.php + 1 terkait");
  });

  it("project saja tanpa editor", () => {
    const pack = buildContextBlock({
      selection: null,
      fileText: "",
      fileName: "",
      language: "",
      project: "Express • TypeScript"
    });
    expect(pack.block).toContain("[Project: Express • TypeScript]");
    expect(pack.label).toBe("Express • TypeScript");
  });
});
