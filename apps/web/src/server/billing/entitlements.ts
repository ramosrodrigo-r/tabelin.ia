import type { UserEntitlement } from "@tabelin/shared";

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

  if (entitlement && entitlement.plan === "pro") {
    return {
      plan: "pro",
      cycle: entitlement.cycle as "monthly" | "annual" | undefined,
      status: entitlement.status as "active",
      currentPeriodEnd: entitlement.currentPeriodEnd ?? undefined,
      priority: true
    };
  }

  const recentlyCanceled = await prisma.entitlement.findFirst({
    where: {
      userId,
      plan: "pro",
      status: "canceled",
      updatedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
    },
    orderBy: { updatedAt: "desc" }
  });

  return {
    plan: "free",
    status: "active",
    recentlyRevoked: !!recentlyCanceled
  };
}
