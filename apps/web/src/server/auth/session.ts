import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export const SESSION_COOKIE = "tabelin_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

type SessionPayload = {
  user: SessionUser;
  expiresAt: number;
};

function getSecret() {
  return process.env.BETTER_AUTH_SECRET ?? "local-development-secret-change-me";
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(input: string) {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  return Buffer.from(padded.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString("utf8");
}

function sign(value: string) {
  return base64Url(createHmac("sha256", getSecret()).update(value).digest());
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createSessionUser(email: string, name?: string): SessionUser {
  const normalized = normalizeEmail(email);
  const id = createHmac("sha256", getSecret()).update(normalized).digest("hex").slice(0, 24);

  return {
    id,
    email: normalized,
    name: name?.trim() || normalized.split("@")[0] || "Usuario"
  };
}

export function createSessionToken(user: SessionUser, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const payload: SessionPayload = {
    user,
    expiresAt: Date.now() + maxAgeSeconds * 1000
  };
  const encoded = base64Url(JSON.stringify(payload));

  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");

  if (!encoded || !signature || !safeEqual(sign(encoded), signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload;

    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }

    return payload.user;
  } catch {
    return null;
  }
}

export function getSessionFromCookieHeader(cookieHeader: string | null) {
  const token = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);

  return verifySessionToken(token);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  return verifySessionToken(token);
}

