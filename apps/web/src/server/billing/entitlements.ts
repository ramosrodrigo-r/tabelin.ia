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
