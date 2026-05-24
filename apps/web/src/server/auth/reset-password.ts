import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";

export const PASSWORD_RESET_IDENTIFIER_PREFIX = "password-reset:";
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

type PasswordResetFailure = {
  ok: false;
  reason: "expired" | "invalid";
};

type PasswordResetSuccess = {
  ok: true;
};

function normalizeResetEmail(email: string) {
  return email.trim().toLowerCase();
}

export function passwordResetIdentifier(email: string) {
  return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${normalizeResetEmail(email)}`;
}

export function generatePasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(email: string) {
  const token = generatePasswordResetToken();
  const identifier = passwordResetIdentifier(email);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  await prisma.verification.deleteMany({ where: { identifier } });
  await prisma.verification.create({
    data: {
      identifier,
      value: hashPasswordResetToken(token),
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function consumePasswordResetToken(
  token: string,
  password: string,
  now = new Date()
): Promise<PasswordResetFailure | PasswordResetSuccess> {
  const tokenHash = hashPasswordResetToken(token);

  return prisma.$transaction(async (tx) => {
    const verification = await tx.verification.findFirst({
      where: {
        identifier: { startsWith: PASSWORD_RESET_IDENTIFIER_PREFIX },
        value: tokenHash
      }
    });

    if (!verification) {
      return { ok: false, reason: "invalid" };
    }

    if (verification.expiresAt <= now) {
      await tx.verification.deleteMany({ where: { id: verification.id } });

      return { ok: false, reason: "expired" };
    }

    const deleted = await tx.verification.deleteMany({
      where: {
        id: verification.id,
        value: tokenHash,
        expiresAt: { gt: now }
      }
    });

    if (deleted.count !== 1) {
      return { ok: false, reason: "invalid" };
    }

    const email = verification.identifier.slice(PASSWORD_RESET_IDENTIFIER_PREFIX.length);
    const updated = await tx.account.updateMany({
      where: {
        providerId: "credential",
        accountId: email
      },
      data: {
        password: hashPassword(password)
      }
    });

    if (updated.count !== 1) {
      return { ok: false, reason: "invalid" };
    }

    return { ok: true };
  });
}
