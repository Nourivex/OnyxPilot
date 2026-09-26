import { describe, expect, it } from "vitest";
import { buildChatRequest, CHAT_HISTORY_LIMIT } from "./conversation";

describe("buildChatRequest", () => {
  it("system: Indonesia + read-only", () => {
    const req = buildChatRequest([], "CTX", "apa ini?");
    expect(req.system).toContain("Bahasa Indonesia");
    expect(req.system).toContain("READ-ONLY");
    expect(req.user).toContain("[Context]\nCTX");
    expect(req.user).toContain("[Question]\napa ini?");
    expect(req.user).not.toContain("[History]");
  });

  it("riwayat dibatasi agar hemat token", () => {
    const history = Array.from({ length: CHAT_HISTORY_LIMIT + 4 }, (_, i) => ({
      role: "user" as const,
      text: `q${i}`
    }));
    const req = buildChatRequest(history, "CTX", "lanjut?");
    expect(req.user).toContain("[History]");
    expect(req.user).not.toContain("q0");
    expect(req.user).toContain(`q${CHAT_HISTORY_LIMIT + 3}`);
  });
});
