import "server-only";

import { prisma } from "@/server/db/client";

import type { FileSchema } from "@tabelin/shared";

/**
 * Create a new UploadedFile record in the database.
 * T-04-01-01: userId is always set — no record exists without user scope.
 */
export async function createUploadedFile(input: {
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  schema: FileSchema;
  rowCount: number;
}) {
  try {
    return await prisma.uploadedFile.create({
      data: {
        userId: input.userId,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        schema: input.schema as object,
        rowCount: input.rowCount
      }
    });
  } catch {
    console.warn("UploadedFile persistence skipped.");
    return null;
  }
}

/**
 * Find an UploadedFile by id, scoped to the authenticated user.
 * T-04-01-01: IDOR guard — both id AND userId must match.
 * Never search by id alone.
 */
export async function findUploadedFileByIdAndUser(id: string, userId: string) {
  try {
    return await prisma.uploadedFile.findFirst({
      where: { id, userId }
    });
  } catch {
    console.warn("UploadedFile lookup failed.");
    return null;
  }
}

/**
 * Update lastChatAt timestamp for an UploadedFile.
 * Used on every chat turn so the cron job can detect inactivity (D-08).
 * T-04-01-01: both id AND userId required.
 */
export async function updateLastChatAt(id: string, userId: string) {
  try {
    return await prisma.uploadedFile.updateMany({
      where: { id, userId },
      data: { lastChatAt: new Date() }
    });
  } catch {
    console.warn("updateLastChatAt skipped.");
    return null;
  }
}

/**
 * Fetch the most recent N chat messages for a file, returned in chronological order.
 * D-08: sliding window of up to 10 messages sent to AI.
 */
export async function getRecentMessages(uploadedFileId: string, limit = 10) {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { uploadedFileId },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    // Reverse so messages are in chronological order for AI context
    return messages.reverse();
  } catch {
    console.warn("getRecentMessages failed.");
    return [];
  }
}

/**
 * Persist a batch of chat messages (user + assistant pair) for a file.
 * D-07: multi-turn history persisted in ChatMessage.
 */
export async function appendChatMessages(
  uploadedFileId: string,
  messages: { role: string; content: string }[]
) {
  try {
    return await prisma.chatMessage.createMany({
      data: messages.map((m) => ({
        uploadedFileId,
        role: m.role,
        content: m.content
      }))
    });
  } catch {
    console.warn("appendChatMessages skipped.");
    return null;
  }
}
