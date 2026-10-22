import { describe, expect, it } from "vitest";

import { isPreviewContext } from "./pwa";

describe("PWA preview host detection", () => {
  it.each([
    "localhost",
    "127.0.0.1",
    "[::1]",
    "id-preview--project.lovable.app",
    "project-preview.example.com",
  ])("rejects preview host %s", (host) => {
    expect(isPreviewContext(host)).toBe(true);
  });

  it("allows a production host", () => {
    expect(isPreviewContext("cartamzquiz.lovable.app")).toBe(false);
  });
});
