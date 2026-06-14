// Smoke tests: rodam contra banco Postgres local real. AI mockado via page.route().
import { expect, test } from "@playwright/test";

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Stream NDJSON do chat unificado para uma pergunta de Q&A (eixo binário pós-Phase 18).
const unifiedQaMockBody = [
  { type: "intent_detected", intent: "qa", confidence: "high" },
  { type: "metadata", metadata: { mode: "generate", providerModel: "mock" } },
  { type: "delta", text: "A média da coluna Valor é 42." },
  { type: "complete", payload: { kind: "qa_response", content: "A média da coluna Valor é 42." } }
]
  .map((e) => JSON.stringify(e))
  .join("\n");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Sign up via fetch from page context (shares cookies + correct Origin).
 * Sets session cookie; subsequent page.goto() calls land in the authed context.
 */
async function signUp(page: import("@playwright/test").Page, suffix?: string) {
  const ts = suffix ?? Date.now();
  const email = `test-${ts}@tabelin-smoke.test`;
  // Must navigate first so Origin header is set correctly by the browser
  await page.goto("/sign-up");
  const result = await page.evaluate(async (data) => {
    const resp = await fetch("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
    return { ok: resp.ok, status: resp.status };
  }, { name: "Smoke Tester", email, password: "senha-segura-123" } as Record<string, string>);
  if (!result.ok) throw new Error(`signUp API failed: ${result.status}`);
  await page.goto("/workspace");
  await expect(page).toHaveURL(/workspace/, { timeout: 10000 });
  return email;
}

/**
 * Sign in via fetch from page context (shares cookies + correct Origin).
 */
async function signInApi(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-in");
  const result = await page.evaluate(async (data) => {
    const resp = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
    return { ok: resp.ok, status: resp.status };
  }, { email, password: "senha-segura-123" } as Record<string, string>);
  if (!result.ok) throw new Error(`signIn API failed: ${result.status}`);
  await page.goto("/workspace");
  await expect(page).toHaveURL(/workspace/, { timeout: 10000 });
}

async function signOut(page: import("@playwright/test").Page) {
  // Use POST (the endpoint only accepts POST; GET returns 404)
  await page.evaluate(() => fetch("/api/auth/sign-out", { method: "POST" }));
  await page.goto("/sign-in");
}

// ─── Suites ──────────────────────────────────────────────────────────────────

test.describe("smoke: auth flow", () => {
  test("sign-up → workspace → sign-out → sign-in → workspace", async ({ page }) => {
    // Test full auth cycle via API (UI form tested separately — see auth-routes.test.ts)
    const email = await signUp(page);
    await expect(page).toHaveURL(/workspace/);

    // Sign out
    await signOut(page);
    await expect(page).not.toHaveURL(/workspace/);

    // Sign back in via API
    await signInApi(page, email);
    await expect(page).toHaveURL(/workspace/);
  });
});

test.describe("smoke: chat unificado", () => {
  test("prompt de Q&A → streaming → resposta visível", async ({ page }) => {
    await page.route("**/api/chat/unified", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: `${unifiedQaMockBody}\n`
      });
    });

    await signUp(page);
    await page.goto("/workspace");

    await page.getByLabel("Pedido").fill("Qual a média da coluna Valor?");
    await page.getByRole("button", { name: "Enviar" }).click();

    await expect(page.getByText("A média da coluna Valor é 42.")).toBeVisible({ timeout: 15_000 });
  });
});
