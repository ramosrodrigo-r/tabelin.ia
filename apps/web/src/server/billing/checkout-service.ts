import "server-only";
import type { PlanCycle } from "@tabelin/shared";
import { createMercadoPagoClient } from "./mercado-pago-client";
import { prisma } from "@/server/db/client";

export type CreateCheckoutOptions = {
  userId: string;
  cycle: PlanCycle;
};

export type CreateCheckoutResult = {
  checkoutUrl: string;
  externalReference: string;
};

export async function createCheckout(options: CreateCheckoutOptions): Promise<CreateCheckoutResult> {
  const { userId, cycle } = options;
  const { config, preference } = createMercadoPagoClient();

  const externalReference = `tabelin_${userId}_${cycle}_${Date.now()}`;

  const isMonthly = cycle === "monthly";
  const title = isMonthly ? "Tabelin.IA Pro mensal" : "Tabelin.IA Pro anual";
  const unitPrice = parseFloat(isMonthly ? config.proMonthlyPriceBRL : config.proAnnualPriceBRL);

  const notificationUrl = `${config.appUrl}/api/billing/mercado-pago/webhook?source_news=webhooks`;
  const backUrls = {
    success: `${config.appUrl}/billing/return`,
    failure: `${config.appUrl}/billing/return`,
    pending: `${config.appUrl}/billing/return`,
  };

  const preferenceResponse = await preference.create({
    body: {
      items: [
        {
          id: cycle,
          title,
          quantity: 1,
          unit_price: unitPrice,
        },
      ],
      external_reference: externalReference,
      notification_url: notificationUrl,
      back_urls: backUrls,
      auto_return: "approved",
    },
  });

  const providerPreferenceId = preferenceResponse.id;
  const checkoutUrl = preferenceResponse.init_point;

  if (!providerPreferenceId || !checkoutUrl) {
    throw new Error("Failed to create Mercado Pago preference - missing ID or checkout URL");
  }

  await prisma.billingCheckout.create({
    data: {
      userId,
      cycle,
      status: "pending",
      provider: "mercado_pago",
      providerPreferenceId,
      externalReference,
      checkoutUrl,
    },
  });

  return {
    checkoutUrl,
    externalReference,
  };
}

export async function getCheckoutByReference(externalReference: string) {
  return prisma.billingCheckout.findUnique({
    where: { externalReference },
  });
}
