import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/auth/[...all]/route";
import { verifyPassword } from "@/server/auth/password";
import { PASSWORD_RESET_IDENTIFIER_PREFIX, hashPasswordResetToken } from "@/server/auth/reset-password";

const db = vi.hoisted(() => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    account: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn()
    },
    verification: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn()
    },
    $transaction: vi.fn()
  };

  return { prisma };
});

vi.mock("@/server/db/client", () => ({ prisma: db.prisma }));

const originalBetterAuthUrl = process.env.BETTER_AUTH_URL;

function authContext(action: string): Parameters<typeof POST>[1] {
  return { params: { all: action.split("/") } };
}

function authRequest(
  action: string,
  body: unknown,
  headers: Record<string, string> = { origin: "http://localhost:3000" }
): Parameters<typeof POST>[0] {
  return new Request(`http://localhost:3000/api/auth/${action}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  }) as Parameters<typeof POST>[0];
}

describe("auth API route hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    db.prisma.$transaction.mockImplementation(async (callback: (tx: typeof db.prisma) => Promise<unknown>) =>
      callback(db.prisma)
    );
  });

  afterAll(() => {
    process.env.BETTER_AUTH_URL = originalBetterAuthUrl;
  });

  it.each([
    ["sign-in/email", { email: "ana@empresa.com", password: "senha1234" }],
    ["sign-up/email", { name: "Ana", email: "ana@empresa.com", password: "senha1234" }],
    ["sign-out", {}],
    ["forget-password", { email: "ana@empresa.com", redirectTo: "/reset-password" }]
  ])("rejects cross-origin POST for %s", async (action, body) => {
    const response = await POST(
      authRequest(action, body, { origin: "https://evil.example" }),
      authContext(action)
    );

    expect(response.status).toBe(403);
    expect(db.prisma.user.findUnique).not.toHaveBeenCalled();
    expect(db.prisma.account.findFirst).not.toHaveBeenCalled();
    expect(db.prisma.verification.create).not.toHaveBeenCalled();
  });

  it("accepts same-host referer when Origin is absent", async () => {
    const response = await POST(
      authRequest("sign-out", {}, { referer: "http://localhost:3000/workspace" }),
      authContext("sign-out")
    );

    expect(response.status).toBe(200);
  });

  it("creates a hashed expiring reset token on forget-password", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    db.prisma.user.findUnique.mockResolvedValue({ id: "user_1", email: "ana@empresa.com" });
    db.prisma.verification.deleteMany.mockResolvedValue({ count: 0 });
    db.prisma.verification.create.mockResolvedValue({ id: "verification_1" });

    const response = await POST(
      authRequest("forget-password", { email: " Ana@Empresa.com ", redirectTo: "/reset-password" }),
      authContext("forget-password")
    );

    const createArg = db.prisma.verification.create.mock.calls[0][0];
    const logLine = info.mock.calls[0][0] as string;
    const resetUrl = logLine.match(/: (https?:\/\/.+)$/)?.[1];
    const token = resetUrl ? new URL(resetUrl).searchParams.get("token") : null;

    expect(response.status).toBe(200);
    expect(db.prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "ana@empresa.com" } });
    expect(db.prisma.verification.deleteMany).toHaveBeenCalledWith({
      where: { identifier: `${PASSWORD_RESET_IDENTIFIER_PREFIX}ana@empresa.com` }
    });
    expect(createArg.data.identifier).toBe(`${PASSWORD_RESET_IDENTIFIER_PREFIX}ana@empresa.com`);
    expect(createArg.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(token).toBeTruthy();
    expect(createArg.data.value).toBe(hashPasswordResetToken(token ?? ""));
    expect(createArg.data.value).not.toBe(token);

    info.mockRestore();
  });

  it("rejects an expired reset token and invalidates it", async () => {
    const token = "expired-token";
    const tokenHash = hashPasswordResetToken(token);
    db.prisma.verification.findFirst.mockResolvedValue({
      id: "verification_expired",
      identifier: `${PASSWORD_RESET_IDENTIFIER_PREFIX}ana@empresa.com`,
      value: tokenHash,
      expiresAt: new Date(Date.now() - 1000)
    });
    db.prisma.verification.deleteMany.mockResolvedValue({ count: 1 });

    const response = await POST(
      authRequest("reset-password", { token, password: "novaSenha123" }),
      authContext("reset-password")
    );

    expect(response.status).toBe(400);
    expect(db.prisma.verification.deleteMany).toHaveBeenCalledWith({ where: { id: "verification_expired" } });
    expect(db.prisma.account.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a reused reset token after it has been invalidated", async () => {
    db.prisma.verification.findFirst.mockResolvedValue(null);

    const response = await POST(
      authRequest("reset-password", { token: "already-used-token", password: "novaSenha123" }),
      authContext("reset-password")
    );

    expect(response.status).toBe(400);
    expect(db.prisma.verification.deleteMany).not.toHaveBeenCalled();
    expect(db.prisma.account.updateMany).not.toHaveBeenCalled();
  });

  it("accepts a valid reset token once and stores the new password hash", async () => {
    const token = "valid-token";
    const tokenHash = hashPasswordResetToken(token);
    db.prisma.verification.findFirst.mockResolvedValue({
      id: "verification_valid",
      identifier: `${PASSWORD_RESET_IDENTIFIER_PREFIX}ana@empresa.com`,
      value: tokenHash,
      expiresAt: new Date(Date.now() + 60_000)
    });
    db.prisma.verification.deleteMany.mockResolvedValue({ count: 1 });
    db.prisma.account.updateMany.mockResolvedValue({ count: 1 });

    const response = await POST(
      authRequest("reset-password", { token, password: "novaSenha123" }),
      authContext("reset-password")
    );

    const updateArg = db.prisma.account.updateMany.mock.calls[0][0];

    expect(response.status).toBe(200);
    expect(db.prisma.verification.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "verification_valid",
        value: tokenHash,
        expiresAt: { gt: expect.any(Date) }
      }
    });
    expect(updateArg.where).toEqual({ providerId: "credential", accountId: "ana@empresa.com" });
    expect(updateArg.data.password).not.toBe("novaSenha123");
    expect(verifyPassword("novaSenha123", updateArg.data.password)).toBe(true);
  });
});
