import { describe, expect, it } from "vitest";
import { offlinePackExpiry, validPack, type OfflinePack } from "./offline-store";
import type { Question } from "./quiz";
describe("downloaded pack access", () => {
  const question: Question = {
    id: "q1",
    question_text: "Question",
    option_a: "A",
    option_b: "B",
    option_c: "C",
    option_d: "D",
    correct_answer: "A",
    explanation: "",
    tip: null,
    difficulty: "facil",
    source: "AUTHORED",
    source_document: null,
    category_id: null,
    image_url: null,
  };
  const pack: OfflinePack = {
    userId: "u1",
    tier: "premium",
    expiresAt: "2026-10-18T00:00:00Z",
    savedAt: "2026-10-17T00:00:00Z",
    questions: [question],
    categories: [],
    images: 1,
  };
  it("does not grant offline access after expiration", () => {
    expect(validPack(pack, Date.parse("2026-10-18T00:00:00Z"))).toBe(false);
    expect(validPack(pack, Date.parse("2026-10-17T00:00:00Z"))).toBe(true);
  });
  it("requires downloaded questions", () => {
    expect(validPack({ ...pack, questions: [] }, Date.parse("2026-10-17T00:00:00Z"))).toBe(false);
  });
  it("only grants access to Premium packs", () => {
    expect(validPack({ ...pack, tier: "free" }, Date.parse("2026-10-17T00:00:00Z"))).toBe(false);
  });

  it("keeps launch packs valid for one year without a subscription expiry", () => {
    const now = Date.parse("2026-10-17T00:00:00Z");
    expect(offlinePackExpiry({ now, launchAccess: true, subscriptionExpiresAt: null })).toBe(
      "2027-10-17T00:00:00.000Z",
    );
  });

  it("keeps regular paid packs bounded by their subscription expiry", () => {
    const now = Date.parse("2026-10-17T00:00:00Z");
    expect(
      offlinePackExpiry({
        now,
        launchAccess: false,
        subscriptionExpiresAt: "2026-10-25T00:00:00Z",
      }),
    ).toBe("2026-10-25T00:00:00.000Z");
  });
});
