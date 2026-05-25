import "server-only";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

export type BillingConfig = {
  mercadoPagoAccessToken: string;
  mercadoPagoWebhookSecret?: string;
  appUrl: string;
  proMonthlyPriceBRL: string;
  proAnnualPriceBRL: string;
};

export function getBillingConfig(): BillingConfig {
  const mercadoPagoAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const proMonthlyPriceBRL = process.env.PRO_MONTHLY_PRICE_BRL;
  const proAnnualPriceBRL = process.env.PRO_ANNUAL_PRICE_BRL;

  if (!mercadoPagoAccessToken || !appUrl || !proMonthlyPriceBRL || !proAnnualPriceBRL) {
    throw new Error(
      "Missing required billing env vars: MERCADO_PAGO_ACCESS_TOKEN, NEXT_PUBLIC_APP_URL, PRO_MONTHLY_PRICE_BRL, PRO_ANNUAL_PRICE_BRL"
    );
  }

  return {
    mercadoPagoAccessToken,
    mercadoPagoWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    appUrl,
    proMonthlyPriceBRL,
    proAnnualPriceBRL,
  };
}

export function createMercadoPagoClient() {
  const config = getBillingConfig();
  const client = new MercadoPagoConfig({
    accessToken: config.mercadoPagoAccessToken,
  });

  return {
    config,
    preference: new Preference(client),
    payment: new Payment(client),
  };
}
