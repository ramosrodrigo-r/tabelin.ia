import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { processMercadoPagoWebhook } from "../src/server/billing/webhook-service";

describe("Mercado Pago Webhook Processing - Unit Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "test-token";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.PRO_MONTHLY_PRICE_BRL = "29.90";
    process.env.PRO_ANNUAL_PRICE_BRL = "299.00";
  });

  afterAll(() => {
    process.env = originalEnv;
  });
  it("should reject webhook with invalid JSON", async () => {
    const result = await processMercadoPagoWebhook("not-json", null);

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("invalid_json");
    }
  });

  it("should reject webhook with missing event fields", async () => {
    const result = await processMercadoPagoWebhook(JSON.stringify({}), null);

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("missing_event_fields");
    }
  });

  it("should reject webhook with missing event ID", async () => {
    const webhookPayload = {
      type: "payment",
      data: {},
    };

    const result = await processMercadoPagoWebhook(JSON.stringify(webhookPayload), null);

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("missing_event_fields");
    }
  });
});
