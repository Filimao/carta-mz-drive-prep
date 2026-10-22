import { describe, expect, it } from "vitest";

import { isPublicRoute } from "./route-auth";

describe("public route access", () => {
  it.each(["/", "/mini-teste", "/auth", "/recuperar-password", "/redefinir-password"])(
    "allows %s without authentication",
    (pathname) => {
      expect(isPublicRoute(pathname)).toBe(true);
    },
  );

  it.each(["/categorias", "/praticar", "/simulados", "/precos", "/sinais", "/offline"])(
    "requires authentication for %s",
    (pathname) => {
      expect(isPublicRoute(pathname)).toBe(false);
    },
  );
});
