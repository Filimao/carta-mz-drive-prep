import { describe, expect, it } from "vitest";
import { readiness } from "./readiness";
describe("exam readiness", () => {
  it("only includes 25-question simulations", () => {
    expect(readiness([{mode:"pratica",total:25,correct:25},{mode:"simulado",total:20,correct:20}]).index).toBeNull();
  });
  it("passes with three errors but not four", () => {
    expect(readiness([{mode:"simulado",total:25,correct:22},{mode:"simulado",total:25,correct:21}])).toEqual({index:86,exams:2,passed:1});
  });
});