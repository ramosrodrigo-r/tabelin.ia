import { NextResponse } from "next/server";
import { processMercadoPagoWebhook } from "@/server/billing/webhook-service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-signature");
  const requestIdHeader = request.headers.get("x-request-id");

  try {
    const result = await processMercadoPagoWebhook(rawBody, {
      signatureHeader,
      requestIdHeader,
      requestUrl: request.url,
    });

    if (!result.processed) {
      console.error("Webhook processing failed:", result.reason);
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    return NextResponse.json({ received: true, action: result.action }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal webhook processing error" }, { status: 500 });
  }
}
