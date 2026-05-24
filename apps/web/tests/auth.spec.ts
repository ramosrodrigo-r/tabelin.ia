import { describe, expect, it } from "vitest";

import {
  createSessionToken,
  createSessionUser,
  getSessionFromCookieHeader,
  normalizeEmail,
  verifySessionToken
} from "@/server/auth/session";

describe("auth session helpers", () => {
  it("normalizes email addresses for account identity", () => {
    expect(normalizeEmail(" Analista@Empresa.COM ")).toBe("analista@empresa.com");
  });

  it("creates a signed session that survives a browser refresh cookie read", () => {
    const user = createSessionUser("ana@empresa.com", "Ana");
    const token = createSessionToken(user);

    expect(verifySessionToken(token)).toEqual(user);
    expect(getSessionFromCookieHeader(`theme=light; tabelin_session=${token}`)).toEqual(user);
  });

  it("rejects tampered session cookies", () => {
    const user = createSessionUser("ana@empresa.com", "Ana");
    const token = `${createSessionToken(user)}x`;

    expect(verifySessionToken(token)).toBeNull();
  });
});

