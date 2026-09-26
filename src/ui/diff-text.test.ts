import { describe, expect, it } from "vitest";
import { spliceText } from "./diff-text";

describe("spliceText", () => {
  it("sisip di posisi kursor", () => {
    expect(spliceText("ab", 1, 1, "X")).toBe("aXb");
  });

  it("ganti rentang selection", () => {
    expect(spliceText("hello world", 6, 11, "AI")).toBe("hello AI");
  });

  it("offset dijepit aman", () => {
    expect(spliceText("ab", -5, 99, "X")).toBe("X");
    expect(spliceText("ab", 1, 0, "X")).toBe("aXb");
  });

  it("multiline tetap utuh", () => {
    const doc = "<?php\necho 1;\n?>";
    expect(spliceText(doc, 6, 13, 'echo "hi";')).toBe(
      '<?php\necho "hi";\n?>'
    );
  });
});
