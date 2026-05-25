import { NextResponse } from "next/server";
import { checkoutRequestSchema, checkoutResponseSchema } from "@tabelin/shared";
import { getCurrentUser } from "@/server/auth/session";
import { createCheckout } from "@/server/billing/checkout-service";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parseResult = checkoutRequestSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid cycle - must be monthly or annual" },
      { status: 400 }
    );
  }

  const { cycle } = parseResult.data;

  try {
    const result = await createCheckout({
      userId: user.id,
      cycle,
    });

    const response = checkoutResponseSchema.parse(result);

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Checkout creation failed:", error);
    return NextResponse.json({ error: "Checkout creation failed" }, { status: 500 });
  }
}
