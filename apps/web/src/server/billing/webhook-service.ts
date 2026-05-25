import "server-only";
import { createHmac } from "node:crypto";
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

function validateWebhookSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) {
    return false;
  }

  const expectedSignature = createHmac("sha256", secret).update(rawBody).digest("hex");

  return signatureHeader === expectedSignature;
}

export async function processMercadoPagoWebhook(
  rawBody: string,
  signatureHeader: string | null
): Promise<WebhookProcessResult> {
  const config = getBillingConfig();

  if (config.mercadoPagoWebhookSecret) {
    const isValid = validateWebhookSignature(rawBody, signatureHeader, config.mercadoPagoWebhookSecret);

    if (!isValid) {
      console.warn("Invalid Mercado Pago webhook signature");
      return { processed: false, reason: "invalid_signature" };
    }
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
