import { headers } from "next/headers";

import { auth } from "@/server/auth/config";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email.split("@")[0]
  };
}

export async function getSessionFromCookieHeader(cookieHeader: string | null): Promise<SessionUser | null> {
  const requestHeaders = new Headers(cookieHeader ? { cookie: cookieHeader } : {});
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? session.user.email.split("@")[0]
  };
}
