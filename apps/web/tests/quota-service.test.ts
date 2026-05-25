import { beforeEach, describe, expect, it, vi } from "vitest";

import { reserveToolUse, confirmToolUse, releaseToolUse } from "@/server/usage/quota-service";

const db = vi.hoisted(() => {
  const prisma = {
    entitlement: {
      findFirst: vi.fn()
    },
    usageLedger: {
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn()
    },
    $transaction: vi.fn()
  };

  return { prisma };
});

vi.mock("@/server/db/client", () => ({ prisma: db.prisma }));

describe("quota service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.prisma.$transaction.mockImplementation(async (callback: (tx: typeof db.prisma) => Promise<unknown>) =>
      callback(db.prisma)
    );
  });

  it("allows the first Free tool use", async () => {
    db.prisma.entitlement.findFirst.mockResolvedValue(null);
    db.prisma.usageLedger.count.mockResolvedValue(0);
    db.prisma.usageLedger.create.mockResolvedValue({ id: "ledger_1" });

    const result = await reserveToolUse("user_1", "formula", "generate");

    expect(result.allowed).toBe(true);
    expect(result).toHaveProperty("reservationKey");
    expect(result).not.toHaveProperty("lastFreeUse");
  });

  it("allows up to the fourth Free tool use", async () => {
    db.prisma.entitlement.findFirst.mockResolvedValue(null);
    db.prisma.usageLedger.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    db.prisma.usageLedger.create.mockResolvedValue({ id: "ledger_4" });

    const result = await reserveToolUse("user_1", "formula", "generate");

    expect(result.allowed).toBe(true);
    expect(result).toHaveProperty("reservationKey");
    expect(result.lastFreeUse).toBe(true);
  });

  it("blocks the fifth Free tool use", async () => {
    db.prisma.entitlement.findFirst.mockResolvedValue(null);
    db.prisma.usageLedger.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);

    const result = await reserveToolUse("user_1", "formula", "generate");

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("quota_exceeded");
      expect(result.meterKind).toBe("tool_use");
    }
  });

  it("allows Pro users to bypass Free quota", async () => {
    db.prisma.entitlement.findFirst.mockResolvedValue({
      id: "ent_1",
      userId: "user_pro",
      plan: "pro",
      cycle: "monthly",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await reserveToolUse("user_pro", "formula", "generate");

    expect(result.allowed).toBe(true);
    expect(result).toHaveProperty("reservationKey");
    expect(db.prisma.usageLedger.count).not.toHaveBeenCalled();
  });

  it("confirms a reserved tool use", async () => {
    db.prisma.usageLedger.updateMany.mockResolvedValue({ count: 1 });

    const result = await confirmToolUse("reservation_key_123");

    expect(result.confirmed).toBe(true);
    expect(db.prisma.usageLedger.updateMany).toHaveBeenCalledWith({
      where: { reservationKey: "reservation_key_123", status: "reserved" },
      data: { status: "confirmed", confirmedAt: expect.any(Date) }
    });
  });

  it("releases a reserved tool use", async () => {
    db.prisma.usageLedger.updateMany.mockResolvedValue({ count: 1 });

    const result = await releaseToolUse("reservation_key_456");

    expect(result.released).toBe(true);
    expect(db.prisma.usageLedger.updateMany).toHaveBeenCalledWith({
      where: { reservationKey: "reservation_key_456", status: "reserved" },
      data: { status: "released", releasedAt: expect.any(Date) }
    });
  });

  it("returns error when confirming non-existent reservation", async () => {
    db.prisma.usageLedger.updateMany.mockResolvedValue({ count: 0 });

    const result = await confirmToolUse("nonexistent");

    expect(result.confirmed).toBe(false);
    if (!result.confirmed) {
      expect(result.reason).toBe("reservation_not_found");
    }
  });
});
