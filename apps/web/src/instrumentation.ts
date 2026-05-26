export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCleanupJob } = await import("./server/file-analysis/cleanup-job");
    startCleanupJob();
  }
}
