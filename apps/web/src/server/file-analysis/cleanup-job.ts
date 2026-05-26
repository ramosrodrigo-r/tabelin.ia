import "server-only";

import cron from "node-cron";

import { prisma } from "@/server/db/client";

export function startCleanupJob() {
  const g = globalThis as typeof globalThis & { _cleanupJobStarted?: boolean };
  if (g._cleanupJobStarted) return;
  g._cleanupJobStarted = true;

  cron.schedule("*/15 * * * *", async () => {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hora de inatividade

    const result = await prisma.uploadedFile.deleteMany({
      where: {
        OR: [
          { lastChatAt: { lt: cutoff } },
          { lastChatAt: null, createdAt: { lt: cutoff } }
        ]
      }
    });

    if (result.count > 0) {
      console.info(`cleanup: ${result.count} registro(s) removido(s)`);
    }
  });
}
