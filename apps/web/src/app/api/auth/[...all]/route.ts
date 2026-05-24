import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  createSessionToken,
  createSessionUser,
  getSessionFromCookieHeader,
  normalizeEmail
} from "@/server/auth/session";
import { hashPassword, verifyPassword } from "@/server/auth/password";
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

      return { ok: true, name: user.name ?? undefined };
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

    return { ok: true, name: user?.name ?? undefined };
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, status: 503 };
    }

    console.warn("Auth persistence unavailable; using signed local session facade.");
    return { ok: true, name };
  }
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
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
    redirectTo?: string;
  } | null;

  if (action === "sign-out") {
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (action === "forget-password") {
    const email = normalizeEmail(body?.email ?? "");
    const resetUrl = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}${body?.redirectTo ?? "/reset-password"}?email=${encodeURIComponent(email)}`;
    console.info(`Password reset link for ${email || "unknown"}: ${resetUrl}`);

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

    const user = createSessionUser(email, persisted.name ?? body.name);
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
