import { describe, expect, it } from "vitest";
import { applyBudget } from "./budget";

const f = (path: string, n: number) => ({ path, text: "x".repeat(n) });

describe("applyBudget", () => {
  it("potong per-file + total + jumlah", () => {
    const res = applyBudget(
      [f("a.php", 100), f("b.php", 5000), f("c.php", 100), f("d.php", 100)],
      { maxFiles: 2, maxCharsPerFile: 1000, maxTotalChars: 500 }
    );
    expect(res.included.map((x) => x.path)).toEqual(["a.php"]);
    expect(res.dropped).toEqual(["b.php", "c.php", "d.php"]);
    expect(res.truncated).toBe(true);
  });

  it("tanpa potong bila muat", () => {
    const res = applyBudget([f("a.php", 10)]);
    expect(res.included).toHaveLength(1);
    expect(res.dropped).toEqual([]);
    expect(res.truncated).toBe(false);
  });
});
