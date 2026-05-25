import "server-only";

export type SupportLinks = {
  emailHref: string;
  whatsAppHref?: string;
};

const DEFAULT_SUPPORT_EMAIL = "suporte@tabelin.ia";
const SUPPORT_EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com", "web.whatsapp.com", "whatsapp.com", "www.whatsapp.com"]);

type SupportEnv = Partial<Record<"NEXT_PUBLIC_PRO_SUPPORT_EMAIL" | "NEXT_PUBLIC_PRO_SUPPORT_WHATSAPP_URL", string>>;

function normalizeSupportEmail(value?: string) {
  const email = value?.trim() || DEFAULT_SUPPORT_EMAIL;

  if (!SUPPORT_EMAIL_PATTERN.test(email) || /[\r\n]/.test(email)) {
    return DEFAULT_SUPPORT_EMAIL;
  }

  return email;
}

function normalizeWhatsAppUrl(value?: string) {
  const rawValue = value?.trim();

  if (!rawValue) {
    return undefined;
  }

  try {
    const url = new URL(rawValue);
    const hostname = url.hostname.toLowerCase();

    if (url.protocol !== "https:" || !WHATSAPP_HOSTS.has(hostname)) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

export function getSupportLinks(env: SupportEnv = process.env as SupportEnv): SupportLinks {
  const email = normalizeSupportEmail(env.NEXT_PUBLIC_PRO_SUPPORT_EMAIL);
  const whatsAppHref = normalizeWhatsAppUrl(env.NEXT_PUBLIC_PRO_SUPPORT_WHATSAPP_URL);

  return {
    emailHref: `mailto:${email}`,
    ...(whatsAppHref ? { whatsAppHref } : {}),
  };
}
