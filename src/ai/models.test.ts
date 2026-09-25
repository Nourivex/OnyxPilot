import { describe, expect, it, vi, afterEach } from "vitest";
import { listOllamaModels, listOpenAIModels } from "./models";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockTags(models: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models })
    })
  );
}

describe("listOllamaModels", () => {
  it("mengembalikan nama model terurut unik", async () => {
    mockTags([{ name: "b:latest" }, { name: "a:latest" }, { name: "a:latest" }]);
    await expect(listOllamaModels("http://localhost:11434/")).resolves.toEqual([
      "a:latest",
      "b:latest"
    ]);
  });

  it("memanggil GET /api/tags", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [] })
    });
    vi.stubGlobal("fetch", fetchMock);
    await listOllamaModels("http://localhost:11434");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:11434/api/tags",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("toleran terhadap respons aneh", async () => {
    mockTags([{ model: "x" }, {}, null]);
    await expect(listOllamaModels("http://x")).resolves.toEqual(["x"]);
    mockTags(undefined);
    await expect(listOllamaModels("http://x")).resolves.toEqual([]);
  });
});

describe("listOpenAIModels", () => {
  it("GET {baseURL}/models + header Bearer, id terurut unik", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ data: [{ id: "b" }, { id: "a" }, { id: "a" }] })
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      listOpenAIModels("http://localhost:20128/v1/", "secret")
    ).resolves.toEqual(["a", "b"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:20128/v1/models",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer secret"
        })
      })
    );
  });

  it("tanpa apiKey: tanpa header auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
    vi.stubGlobal("fetch", fetchMock);
    await listOpenAIModels("http://x", "");
    const opts = fetchMock.mock.calls[0][1] as { headers: object };
    expect(opts.headers).not.toHaveProperty("Authorization");
  });
});
