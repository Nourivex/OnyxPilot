import { describe, expect, it } from "vitest";
import {
  buildChatPayload,
  buildOllamaPayload,
  parseChatResult,
  parseOllamaResult,
  parseOpenAIModels
} from "./protocol";

const req = { system: "SYS", user: "USER" };

describe("ollama protocol", () => {
  it("payload non-streaming ke /api/generate", () => {
    expect(buildOllamaPayload("qwen3:8b", req)).toEqual({
      model: "qwen3:8b",
      system: "SYS",
      prompt: "USER",
      stream: false
    });
  });

  it("tanpa opts: tidak ada think/options (perilaku lama)", () => {
    expect(buildOllamaPayload("m", req)).toEqual({
      model: "m",
      system: "SYS",
      prompt: "USER",
      stream: false
    });
  });

  it("think:false + temperature + numPredict masuk payload", () => {
    expect(
      buildOllamaPayload("m", req, {
        think: false,
        temperature: 0.2,
        numPredict: 1024
      })
    ).toEqual({
      model: "m",
      system: "SYS",
      prompt: "USER",
      stream: false,
      think: false,
      options: { temperature: 0.2, num_predict: 1024 }
    });
  });

  it("numPredict 0/negatif = unset (default Ollama)", () => {
    expect(buildOllamaPayload("m", req, { numPredict: 0 })).toEqual({
      model: "m",
      system: "SYS",
      prompt: "USER",
      stream: false
    });
    expect(
      buildOllamaPayload("m", req, { temperature: Number.NaN })
    ).not.toHaveProperty("options");
  });
  it("parse respons sukses", () => {
    const res = parseOllamaResult({ response: "halo", model: "m" }, "fb");
    expect(res).toEqual({ text: "halo", model: "m" });
  });

  it("model fallback bila absen", () => {
    expect(parseOllamaResult({ response: "x" }, "fb").model).toBe("fb");
  });

  it("error Ollama (mis. model tidak ada) dilempar jelas", () => {
    expect(() =>
      parseOllamaResult({ error: 'model "xxx" not found' }, "fb")
    ).toThrow(/not found/);
  });

  it("respons kosong ditolak", () => {
    expect(() => parseOllamaResult({}, "fb")).toThrow(/kosong/);
  });
});

describe("openai-compatible protocol", () => {
  it("payload chat messages", () => {
    expect(buildChatPayload("m", req)).toEqual({
      model: "m",
      messages: [
        { role: "system", content: "SYS" },
        { role: "user", content: "USER" }
      ],
      stream: false
    });
  });

  it("parse choices[0]", () => {
    const res = parseChatResult(
      { choices: [{ message: { content: "jawab" } }], model: "m" },
      "fb"
    );
    expect(res).toEqual({ text: "jawab", model: "m" });
  });

  it("error API (mis. 401) dilempar jelas", () => {
    expect(() =>
      parseChatResult({ error: { message: "invalid key" } }, "fb")
    ).toThrow(/invalid key/);
  });

  it("fallback ke reasoning_content bila content kosong", () => {
    const res = parseChatResult(
      { choices: [{ message: { content: "", reasoning_content: "pikir" } }] },
      "fb"
    );
    expect(res.text).toBe("pikir");
  });
});

describe("parseOpenAIModels", () => {
  it("id terurut unik, toleran data aneh", () => {
    expect(
      parseOpenAIModels({ data: [{ id: "b" }, { id: "a" }, {}, null] })
    ).toEqual(["a", "b"]);
    expect(parseOpenAIModels({})).toEqual([]);
  });
});
