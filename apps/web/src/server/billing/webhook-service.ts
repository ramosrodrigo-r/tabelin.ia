import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createMercadoPagoClient, getBillingConfig } from "./mercado-pago-client";
import { getCheckoutByReference } from "./checkout-service";
import { activateProEntitlement, revokeProEntitlement } from "./entitlements";
import { prisma } from "@/server/db/client";

export type WebhookProcessResult =
  | { processed: true; action: "activated" | "revoked" | "ignored" | "duplicate" }
  | { processed: false; reason: string };

type MercadoPagoWebhookPayload = {
  id?: string;
  type?: string;
  action?: string;
  data?: {
    id?: string;
  };
};

export type MercadoPagoWebhookOptions = {
  signatureHeader?: string | null;
  requestIdHeader?: string | null;
  requestUrl?: string;
  receivedAtMs?: number;
};

const WEBHOOK_SIGNATURE_TOLERANCE_MS = 10 * 60 * 1000;

function parseSignatureHeader(signatureHeader: string) {
  const entries = new Map<string, string>();

  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=", 2);

    if (key && value) {
      entries.set(key.trim(), value.trim());
    }
  }

  return {
    timestamp: entries.get("ts"),
    signature: entries.get("v1"),
  };
}

function getDataIdFromUrl(requestUrl?: string) {
  if (!requestUrl) {
    return undefined;
  }

  try {
    return new URL(requestUrl).searchParams.get("data.id") ?? undefined;
  } catch {
    return undefined;
  }
}

function compareHexSignatures(received: string, expected: string) {
  if (!/^[a-f0-9]+$/i.test(received) || received.length % 2 !== 0) {
    return false;
  }

  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function validateWebhookSignature(options: MercadoPagoWebhookOptions & { secret: string }): boolean {
  const { signatureHeader, requestIdHeader, requestUrl, receivedAtMs, secret } = options;

  if (!signatureHeader) {
    return false;
  }

  const { timestamp, signature } = parseSignatureHeader(signatureHeader);
  const timestampMs = Number(timestamp);

  if (!timestamp || !signature || !Number.isFinite(timestampMs)) {
    return false;
  }

  const now = receivedAtMs ?? Date.now();

  if (Math.abs(now - timestampMs) > WEBHOOK_SIGNATURE_TOLERANCE_MS) {
    return false;
  }

  const dataId = getDataIdFromUrl(requestUrl);
  const manifest = [
    dataId ? `id:${dataId};` : "",
    requestIdHeader ? `request-id:${requestIdHeader};` : "",
    `ts:${timestamp};`,
  ].join("");
  const expectedSignature = createHmac("sha256", secret).update(manifest).digest("hex");

  return compareHexSignatures(signature, expectedSignature);
}

export async function processMercadoPagoWebhook(
  rawBody: string,
  options: MercadoPagoWebhookOptions = {}
): Promise<WebhookProcessResult> {
  const config = getBillingConfig();

  if (config.mercadoPagoWebhookSecret) {
    const isValid = validateWebhookSignature({
      ...options,
      secret: config.mercadoPagoWebhookSecret,
    });

    if (!isValid) {
      console.warn("Invalid Mercado Pago webhook signature");
      return { processed: false, reason: "invalid_signature" };
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("MERCADO_PAGO_WEBHOOK_SECRET must be configured in production");
    return { processed: false, reason: "missing_webhook_secret" };
  } else {
    console.warn("MERCADO_PAGO_WEBHOOK_SECRET not configured - webhook signature validation skipped (dev/test only)");
  }

  let payload: MercadoPagoWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { processed: false, reason: "invalid_json" };
  }

  const providerEventId = payload.id || payload.data?.id;
  const topic = payload.type;
  const resourceId = payload.data?.id;

  if (!providerEventId || !topic) {
    return { processed: false, reason: "missing_event_fields" };
  }

  const existingEvent = await prisma.paymentEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: "mercado_pago",
        providerEventId,
      },
    },
  });

  if (existingEvent) {
    return { processed: true, action: "duplicate" };
  }

  await prisma.paymentEvent.create({
    data: {
      provider: "mercado_pago",
      providerEventId,
      topic,
      resourceId: resourceId || providerEventId,
      status: "pending",
      rawPayload: rawBody,
    },
  });

  if (topic !== "payment") {
    await prisma.paymentEvent.update({
      where: {
        provider_providerEventId: {
          provider: "mercado_pago",
          providerEventId,
        },
      },
      data: {
        status: "ignored",
        processedAt: new Date(),
      },
    });
    return { processed: true, action: "ignored" };
  }

  if (!resourceId) {
    return { processed: false, reason: "missing_resource_id" };
  }

  const { payment } = createMercadoPagoClient();
  const paymentResource = await payment.get({ id: resourceId });

  const externalReference = paymentResource.external_reference;
  const paymentStatus = paymentResource.status;

  if (!externalReference) {
    await prisma.paymentEvent.update({
      where: {
        provider_providerEventId: {
          provider: "mercado_pago",
          providerEventId,
        },
      },
      data: {
        status: "ignored",
        processedAt: new Date(),
      },
    });
    return { processed: true, action: "ignored" };
  }

  const checkout = await getCheckoutByReference(externalReference);

  if (!checkout) {
    await prisma.paymentEvent.update({
      where: {
        provider_providerEventId: {
          provider: "mercado_pago",
          providerEventId,
        },
      },
      data: {
        status: "ignored",
        processedAt: new Date(),
      },
    });
    return { processed: true, action: "ignored" };
  }

  if (paymentStatus === "approved") {
    await activateProEntitlement({
      userId: checkout.userId,
      cycle: checkout.cycle as "monthly" | "annual",
      providerPaymentId: resourceId,
    });

    await prisma.billingCheckout.update({
      where: { id: checkout.id },
      data: { status: "approved" },
    });

    await prisma.paymentEvent.update({
      where: {
        provider_providerEventId: {
          provider: "mercado_pago",
          providerEventId,
        },
      },
      data: {
        status: "processed",
        processedAt: new Date(),
      },
    });

    return { processed: true, action: "activated" };
  }

  if (["rejected", "cancelled", "refunded", "charged_back"].includes(paymentStatus || "")) {
    await revokeProEntitlement(checkout.userId);

    await prisma.billingCheckout.update({
      where: { id: checkout.id },
      data: { status: paymentStatus || "rejected" },
    });

    await prisma.paymentEvent.update({
      where: {
        provider_providerEventId: {
          provider: "mercado_pago",
          providerEventId,
        },
      },
      data: {
        status: "processed",
        processedAt: new Date(),
      },
    });

    return { processed: true, action: "revoked" };
  }

  await prisma.paymentEvent.update({
    where: {
      provider_providerEventId: {
        provider: "mercado_pago",
        providerEventId,
      },
    },
    data: {
      status: "ignored",
      processedAt: new Date(),
    },
  });

  return { processed: true, action: "ignored" };
}
