import { randomBytes } from "node:crypto";

import { FREE_QUOTAS } from "@tabelin/shared";

import { prisma } from "@/server/db/client";
import { getUserEntitlement } from "@/server/billing/entitlements";

import type { MeterKind, QuotaCheckResult, QuotaConfirmResult, QuotaReleaseResult } from "./quota-types";

const MAX_RETRIES = 3;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (
      retries > 0 &&
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "P2034" || error.code === "P2002")
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

export async function reserveToolUse(
  userId: string,
  toolKind: string,
  mode: string
): Promise<QuotaCheckResult> {
  const entitlement = await getUserEntitlement(userId);

  if (entitlement.plan === "pro" && entitlement.status === "active") {
    const reservationKey = `${userId}-tool-${Date.now()}-${randomBytes(8).toString("hex")}`;
    return { allowed: true, reservationKey, priority: true };
  }

  const meterKind: MeterKind = "tool_use";
  const quota = FREE_QUOTAS[meterKind];
  const windowStart = new Date(Date.now() - quota.windowHours * 60 * 60 * 1000);

  return withRetry(async () => {
    return prisma.$transaction(
      async (tx) => {
        const confirmed = await tx.usageLedger.count({
          where: {
            userId,
            meterKind,
            status: "confirmed",
            createdAt: { gte: windowStart }
          }
        });

        const reserved = await tx.usageLedger.count({
          where: {
            userId,
            meterKind,
            status: "reserved",
            createdAt: { gte: windowStart }
          }
        });

        const total = confirmed + reserved;

        if (total >= quota.limit) {
          return { allowed: false, reason: "quota_exceeded" as const, meterKind };
        }

        const reservationKey = `${userId}-tool-${Date.now()}-${randomBytes(8).toString("hex")}`;

        await tx.usageLedger.create({
          data: {
            userId,
            meterKind,
            toolKind,
            mode,
            status: "reserved",
            reservationKey,
            periodStart: windowStart,
            periodEnd: new Date()
          }
        });

        const lastFreeUse = total === quota.limit - 1;

        return { allowed: true, reservationKey, ...(lastFreeUse && { lastFreeUse: true }) };
      },
      { isolationLevel: "Serializable" }
    );
  });
}

export async function confirmToolUse(reservationKey: string): Promise<QuotaConfirmResult> {
  try {
    const result = await prisma.usageLedger.updateMany({
      where: { reservationKey, status: "reserved" },
      data: { status: "confirmed", confirmedAt: new Date() }
    });

    if (result.count === 0) {
      return { confirmed: false, reason: "reservation_not_found" };
    }

    return { confirmed: true };
  } catch {
    return { confirmed: false, reason: "database_error" };
  }
}

export async function releaseToolUse(reservationKey: string): Promise<QuotaReleaseResult> {
  try {
    const result = await prisma.usageLedger.updateMany({
      where: { reservationKey, status: "reserved" },
      data: { status: "released", releasedAt: new Date() }
    });

    if (result.count === 0) {
      return { released: false, reason: "reservation_not_found" };
    }

    return { released: true };
  } catch {
    return { released: false, reason: "database_error" };
  }
}
