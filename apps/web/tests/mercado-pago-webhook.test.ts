import { createHmac } from "node:crypto";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { processMercadoPagoWebhook } from "../src/server/billing/webhook-service";

function signedHeader(options: { secret: string; timestamp: number; requestId?: string; dataId?: string }) {
  const manifest = [
    options.dataId ? `id:${options.dataId};` : "",
    options.requestId ? `request-id:${options.requestId};` : "",
    `ts:${options.timestamp};`,
  ].join("");
  const signature = createHmac("sha256", options.secret).update(manifest).digest("hex");

  return `ts=${options.timestamp},v1=${signature}`;
}

describe("Mercado Pago Webhook Processing - Unit Tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    process.env = { ...originalEnv };
    process.env.MERCADO_PAGO_ACCESS_TOKEN = "test-token";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.PRO_MONTHLY_PRICE_BRL = "29.90";
    process.env.PRO_ANNUAL_PRICE_BRL = "299.00";
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });
  it("should reject webhook with invalid JSON", async () => {
    const result = await processMercadoPagoWebhook("not-json");

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("invalid_json");
    }
  });

  it("should reject webhook with missing event fields", async () => {
    const result = await processMercadoPagoWebhook(JSON.stringify({}));

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

    const result = await processMercadoPagoWebhook(JSON.stringify(webhookPayload));

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("missing_event_fields");
    }
  });

  it("accepts Mercado Pago x-signature ts/v1 manifest before payload validation", async () => {
    const secret = "webhook-secret";
    const timestamp = Date.parse("2026-05-25T12:00:00.000Z");
    const requestId = "bb56a2f1-6aae-46ac-982e-9dcd3581d08e";
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;

    const result = await processMercadoPagoWebhook("not-json", {
      signatureHeader: signedHeader({ secret, timestamp, requestId, dataId: "123456" }),
      requestIdHeader: requestId,
      requestUrl: "http://localhost:3000/api/billing/mercado-pago/webhook?data.id=123456&type=payment",
      receivedAtMs: timestamp + 1000,
    });

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("invalid_json");
    }
  });

  it("rejects invalid Mercado Pago signatures", async () => {
    const timestamp = Date.parse("2026-05-25T12:00:00.000Z");
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "webhook-secret";

    const result = await processMercadoPagoWebhook("not-json", {
      signatureHeader: `ts=${timestamp},v1=${"0".repeat(64)}`,
      requestIdHeader: "req_123",
      requestUrl: "http://localhost:3000/api/billing/mercado-pago/webhook?data.id=123456&type=payment",
      receivedAtMs: timestamp,
    });

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("invalid_signature");
    }
  });

  it("rejects stale Mercado Pago signatures", async () => {
    const secret = "webhook-secret";
    const timestamp = Date.parse("2026-05-25T12:00:00.000Z");
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;

    const result = await processMercadoPagoWebhook("not-json", {
      signatureHeader: signedHeader({ secret, timestamp, requestId: "req_123", dataId: "123456" }),
      requestIdHeader: "req_123",
      requestUrl: "http://localhost:3000/api/billing/mercado-pago/webhook?data.id=123456&type=payment",
      receivedAtMs: timestamp + 11 * 60 * 1000,
    });

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("invalid_signature");
    }
  });

  it("fails closed in production when webhook secret is missing", async () => {
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    vi.stubEnv("NODE_ENV", "production");

    const result = await processMercadoPagoWebhook("not-json");

    expect(result.processed).toBe(false);
    if (!result.processed) {
      expect(result.reason).toBe("missing_webhook_secret");
    }
  });
});
