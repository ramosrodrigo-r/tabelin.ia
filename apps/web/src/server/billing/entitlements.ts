import type { UserEntitlement, PlanCycle } from "@tabelin/shared";

import { prisma } from "@/server/db/client";

export async function getUserEntitlement(userId: string): Promise<UserEntitlement> {
  const entitlement = await prisma.entitlement.findFirst({
    where: {
      userId,
      status: "active",
      OR: [{ currentPeriodEnd: { gte: new Date() } }, { currentPeriodEnd: null }]
    },
    orderBy: { createdAt: "desc" }
  });

  if (!entitlement || entitlement.plan === "free") {
    return { plan: "free", status: "active" };
  }

  return {
    plan: "pro",
    cycle: entitlement.cycle as "monthly" | "annual" | undefined,
    status: entitlement.status as "active",
    currentPeriodEnd: entitlement.currentPeriodEnd ?? undefined
  };
}

export type ActivateProOptions = {
  userId: string;
  cycle: PlanCycle;
  providerPaymentId: string;
};

export async function activateProEntitlement(options: ActivateProOptions) {
  const { userId, cycle, providerPaymentId } = options;

  const now = new Date();
  const periodEnd = new Date(now);

  if (cycle === "monthly") {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  const existingActive = await prisma.entitlement.findFirst({
    where: {
      userId,
      status: "active",
    },
  });

  if (existingActive) {
    await prisma.entitlement.update({
      where: { id: existingActive.id },
      data: {
        status: "expired",
      },
    });
  }

  await prisma.entitlement.create({
    data: {
      userId,
      plan: "pro",
      cycle,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      provider: "mercado_pago",
      providerSubId: providerPaymentId,
    },
  });
}

export async function revokeProEntitlement(userId: string) {
  const activeEntitlement = await prisma.entitlement.findFirst({
    where: {
      userId,
      status: "active",
      plan: "pro",
    },
  });

  if (activeEntitlement) {
    await prisma.entitlement.update({
      where: { id: activeEntitlement.id },
      data: {
        status: "canceled",
      },
    });
  }
}
