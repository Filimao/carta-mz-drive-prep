import { describe, expect, it } from "vitest";
import { validPack, type OfflinePack } from "./offline-store";
describe("downloaded pack access", () => {
  const pack = { userId: "u1", expiresAt: "2026-10-18T00:00:00Z", savedAt: "2026-10-17T00:00:00Z", questions: [{id:"q1"}], images:1 } as OfflinePack;
  it("does not grant offline access after expiration", () => {
    expect(validPack(pack, Date.parse("2026-10-18T00:00:00Z"))).toBe(false);
    expect(validPack(pack, Date.parse("2026-10-17T00:00:00Z"))).toBe(true);
  });
  it("requires downloaded questions", () => {
    expect(validPack({...pack,questions:[]}, Date.parse("2026-10-17T00:00:00Z"))).toBe(false);
  });
});