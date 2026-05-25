import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  createSessionToken,
  createSessionUser,
  getSessionFromCookieHeader,
  normalizeEmail
} from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { consumePasswordResetToken, createPasswordResetToken } from "@/server/auth/reset-password";
import { prisma } from "@/server/db/client";

type RouteContext = {
  params: Promise<{ all?: string[] }> | { all?: string[] };
};

async function getSegments(context: RouteContext) {
  const params = await context.params;

  return params.all ?? [];
}

async function persistCredentials(action: "sign-in/email" | "sign-up/email", email: string, password: string, name?: string) {
  try {
    if (action === "sign-up/email") {
      const user = await prisma.user.upsert({
        where: { email },
        update: { name: name || undefined },
        create: {
          email,
          name: name || email.split("@")[0],
          emailVerified: true
        }
      });

      const existingAccount = await prisma.account.findFirst({
        where: { providerId: "credential", accountId: email }
      });

      if (existingAccount) {
        await prisma.account.update({
          where: { id: existingAccount.id },
          data: { password: hashPassword(password), userId: user.id }
        });
      } else {
        await prisma.account.create({
          data: {
            providerId: "credential",
            accountId: email,
            password: hashPassword(password),
            userId: user.id
          }
        });
      }

      return { ok: true, userId: user.id, name: user.name ?? undefined };
    }

    const account = await prisma.account.findFirst({
      where: {
        providerId: "credential",
        accountId: email
      }
    });

    if (!account || !verifyPassword(password, account.password)) {
      return { ok: false, status: 401 };
    }

    const user = await prisma.user.findUnique({ where: { id: account.userId } });

    return { ok: true, userId: user?.id, name: user?.name ?? undefined };
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, status: 503 };
    }

    console.warn("Auth persistence unavailable; using signed local session facade.");
    return { ok: true, userId: undefined, name };
  }
}

function getOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getRequestSourceOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin) {
    return getOrigin(origin);
  }

  return getOrigin(request.headers.get("referer"));
}

function getAllowedAuthOrigins(request: NextRequest) {
  const allowedOrigins = new Set<string>();
  const configuredOrigin = getOrigin(process.env.BETTER_AUTH_URL);

  if (configuredOrigin) {
    allowedOrigins.add(configuredOrigin);
  }

  allowedOrigins.add(new URL(request.url).origin);

  return allowedOrigins;
}

function validateAuthPostOrigin(request: NextRequest) {
  const sourceOrigin = getRequestSourceOrigin(request);

  if (!sourceOrigin || !getAllowedAuthOrigins(request).has(sourceOrigin)) {
    return NextResponse.json({ error: "Origem da requisicao nao permitida." }, { status: 403 });
  }

  return null;
}

function getSafeResetPath(redirectTo: string | undefined) {
  if (!redirectTo || !redirectTo.startsWith("/") || redirectTo.startsWith("//")) {
    return "/reset-password";
  }

  let parsed: URL;

  try {
    parsed = new URL(redirectTo, "http://tabelin.local");
  } catch {
    return "/reset-password";
  }

  return `${parsed.pathname}${parsed.search}`;
}

function buildResetUrl(request: NextRequest, redirectTo: string | undefined, token: string) {
  const baseOrigin = getOrigin(process.env.BETTER_AUTH_URL) ?? new URL(request.url).origin;
  const resetUrl = new URL(getSafeResetPath(redirectTo), baseOrigin);
  resetUrl.searchParams.set("token", token);

  return resetUrl.toString();
}

async function createResetLinkIfUserExists(request: NextRequest, email: string, redirectTo: string | undefined) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return null;
  }

  const { token } = await createPasswordResetToken(email);

  return buildResetUrl(request, redirectTo, token);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const segments = await getSegments(context);

  if (segments.join("/") === "session") {
    const user = getSessionFromCookieHeader(request.headers.get("cookie"));

    return NextResponse.json({ session: user ? { user } : null, user });
  }

  return NextResponse.json({ error: "Rota de auth nao encontrada." }, { status: 404 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const segments = await getSegments(context);
  const action = segments.join("/");

  const originError = validateAuthPostOrigin(request);

  if (originError) {
    return originError;
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
    redirectTo?: string;
    token?: string;
  } | null;

  if (action === "sign-out") {
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (action === "forget-password") {
    const email = normalizeEmail(body?.email ?? "");

    if (email) {
      try {
        const resetUrl = await createResetLinkIfUserExists(request, email, body?.redirectTo);

        if (resetUrl) {
          console.info(`Password reset link for ${email}: ${resetUrl}`);
        }
      } catch {
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json({ error: "Nao foi possivel gerar o link de redefinicao." }, { status: 503 });
        }

        console.warn("Password reset persistence unavailable; skipping reset link creation.");
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "reset-password") {
    if (!body?.token || !body.password || body.password.length < 8) {
      return NextResponse.json({ error: "Token e nova senha sao obrigatorios." }, { status: 400 });
    }

    const result = await consumePasswordResetToken(body.token, body.password);

    if (!result.ok) {
      const error = result.reason === "expired" ? "Token expirado." : "Token invalido.";

      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "sign-up/email" || action === "sign-in/email") {
    if (!body?.email || !body.password || body.password.length < 8) {
      return NextResponse.json({ error: "Email e senha sao obrigatorios." }, { status: 400 });
    }

    const email = normalizeEmail(body.email);
    const persisted = await persistCredentials(action, email, body.password, body.name);

    if (!persisted.ok) {
      return NextResponse.json({ error: "Credenciais invalidas." }, { status: persisted.status });
    }

    const user = persisted.userId
      ? { id: persisted.userId, email, name: (persisted.name ?? body.name ?? email.split("@")[0]) || "Usuario" }
      : createSessionUser(email, persisted.name ?? body.name);
    const response = NextResponse.json({ ok: true, user });
    const token = createSessionToken(user);

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  }

  return NextResponse.json({ error: "Rota de auth nao encontrada." }, { status: 404 });
}
