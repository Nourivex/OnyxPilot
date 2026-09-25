import { describe, expect, it } from "vitest";
import {
  extractCodeBlocks,
  extractExplanation,
  extractPrimaryCode
} from "./code-extract";

const SAMPLE = `Here is your code:

\`\`\`php
<?php
echo "hi";
?>
\`\`\`

Hope it helps!`;

describe("extractCodeBlocks", () => {
  it("ambil isi fence tanpa marker", () => {
    expect(extractCodeBlocks(SAMPLE)).toEqual(['<?php\necho "hi";\n?>']);
  });

  it("beberapa fence → semua diambil", () => {
    const t = "```js\nconst a = 1;\n```\ntext\n```js\nconst b = 2;\n```";
    expect(extractCodeBlocks(t)).toEqual(["const a = 1;", "const b = 2;"]);
  });

  it("tanpa fence → kosong", () => {
    expect(extractCodeBlocks("plain text")).toEqual([]);
  });
});

describe("extractPrimaryCode", () => {
  it("fence pertama yang ditempel", () => {
    expect(extractPrimaryCode(SAMPLE)).toBe('<?php\necho "hi";\n?>');
  });

  it("tanpa fence → seluruh teks", () => {
    expect(extractPrimaryCode("  const x = 1;  ")).toBe("const x = 1;");
  });
});

describe("extractExplanation", () => {
  it("teks di luar fence", () => {
    expect(extractExplanation(SAMPLE)).toBe(
      "Here is your code:\n\nHope it helps!"
    );
  });

  it("tanpa fence → kosong", () => {
    expect(extractExplanation("plain")).toBe("");
  });
});
