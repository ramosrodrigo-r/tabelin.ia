import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getBillingConfig } from "../src/server/billing/mercado-pago-client";

describe("Billing Configuration", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should throw when required billing env vars are missing", () => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.PRO_MONTHLY_PRICE_BRL;
    delete process.env.PRO_ANNUAL_PRICE_BRL;

    expect(() => getBillingConfig()).toThrow(/Missing required billing env vars/);
  });

  it("should return config when all required env vars are present", () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "test-token";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.PRO_MONTHLY_PRICE_BRL = "29.90";
    process.env.PRO_ANNUAL_PRICE_BRL = "299.00";

    const config = getBillingConfig();

    expect(config.mercadoPagoAccessToken).toBe("test-token");
    expect(config.appUrl).toBe("http://localhost:3000");
    expect(config.proMonthlyPriceBRL).toBe("29.90");
    expect(config.proAnnualPriceBRL).toBe("299.00");
  });

  it("should handle optional webhook secret", () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "test-token";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.PRO_MONTHLY_PRICE_BRL = "29.90";
    process.env.PRO_ANNUAL_PRICE_BRL = "299.00";
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-123";

    const config = getBillingConfig();

    expect(config.mercadoPagoWebhookSecret).toBe("secret-123");
  });
});
