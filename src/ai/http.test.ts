import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError, normalizeUrl, postJson } from "./http";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeUrl", () => {
  it("buang trailing slash", () => {
    expect(normalizeUrl("http://localhost:11434/")).toBe(
      "http://localhost:11434"
    );
    expect(normalizeUrl("http://x/v1")).toBe("http://x/v1");
  });
});

describe("postJson", () => {
  it("sukses mengembalikan json", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ a: 1 }) })
    );
    await expect(postJson("http://x", {})).resolves.toEqual({ a: 1 });
  });

  it("status non-OK jadi HttpError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("nope")
      })
    );
    const err = await postJson("http://x", {}).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(404);
  });

  it("gagal konek jadi pesan ramah", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    );
    await expect(postJson("http://x", {})).rejects.toThrow(
      /Tidak bisa terhubung/
    );
  });
});
