import { describe, expect, it } from "vitest";

import { whatsappAptoShareUrl } from "./sharing";

describe("WhatsApp exam result sharing", () => {
  it("includes the passing score and site URL in the prepared message", () => {
    const url = new URL(whatsappAptoShareUrl(22, "https://example.test"));
    const message = url.searchParams.get("text");

    expect(url.origin + url.pathname).toBe("https://wa.me/");
    expect(message).toContain("APTO");
    expect(message).toContain("22/25");
    expect(message).toContain("https://example.test");
    expect(message).toContain("Treina grátis");
    expect(message).not.toContain("simulador oficial");
  });
});
