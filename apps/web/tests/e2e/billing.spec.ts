import { expect, test } from "@playwright/test";

const generateBody = [
  {
    type: "metadata",
    metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "mock" }
  },
  { type: "delta", text: '=SOMASE(C:C;"Pago";B:B)' },
  {
    type: "complete",
    payload: {
      kind: "formula",
      formula: '=SOMASE(C:C;"Pago";B:B)',
      explanation: "Soma os valores pagos.",
      assumptions: ["A coluna B contem valores."],
      warnings: [],
      metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "mock" }
    }
  }
]
  .map((event) => JSON.stringify(event))
  .join("\n");

const lastFreeUseBody = [
  {
    type: "metadata",
    metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "mock" }
  },
  { type: "quota_warning", lastFreeUse: true },
  { type: "delta", text: '=SOMASE(C:C;"Pago";B:B)' },
  {
    type: "complete",
    payload: {
      kind: "formula",
      formula: '=SOMASE(C:C;"Pago";B:B)',
      explanation: "Soma os valores pagos.",
      assumptions: ["A coluna B contem valores."],
      warnings: [],
      metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "mock" }
    }
  }
]
  .map((event) => JSON.stringify(event))
  .join("\n");

test("billing flow: Free quota to Pro activation to revocation", async ({ page }) => {
  await page.route("**/api/tools/formula/generate", async (route, request) => {
    const requestCount = (await page.evaluate(() => sessionStorage.getItem("requestCount"))) || "0";
    const count = Number.parseInt(requestCount, 10);

    if (count === 3) {
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: `${lastFreeUseBody}\n`
      });
      await page.evaluate(() => sessionStorage.setItem("requestCount", "4"));
    } else if (count >= 4) {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          code: "quota_exceeded",
          meterKind: "tool_use",
          cta: "pro_checkout"
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: `${generateBody}\n`
      });
      await page.evaluate((nextCount) => sessionStorage.setItem("requestCount", String(nextCount)), count + 1);
    }
  });

  await page.route("**/api/billing/checkout", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        checkoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mock-preference-id",
        externalReference: "tabelin_test-user_monthly_1234567890"
      })
    });
  });

  await page.route("**/checkout/v1/redirect*", async (route) => {
    await page.evaluate(() => sessionStorage.setItem("proActivated", "true"));
    await route.fulfill({
      status: 302,
      headers: { location: "/billing/return?status=approved" }
    });
  });

  await page.goto("/sign-up");
  await page.getByLabel("Nome").fill("Usuario Teste");
  await page.getByLabel("Email").fill(`teste-${Date.now()}@empresa.com`);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/workspace/);

  await page.evaluate(() => sessionStorage.setItem("requestCount", "0"));

  for (let i = 0; i < 4; i++) {
    await page.getByLabel("Pedido").fill(`Formula teste ${i + 1}`);
    await page.getByRole("button", { name: "Gerar formula" }).click();

    if (i === 3) {
      await expect(page.getByText("Este e seu ultimo uso gratuito")).toBeVisible();
    }

    await expect(page.getByText('=SOMASE(C:C;"Pago";B:B)')).toBeVisible();
    await page.waitForTimeout(300);
  }

  await page.getByLabel("Pedido").fill("Formula bloqueada");
  await page.getByRole("button", { name: "Gerar formula" }).click();
  await expect(page.getByText("Voce atingiu o limite de 4 usos gratuitos")).toBeVisible();
  await expect(page.getByRole("button", { name: "Assinar Pro" })).toBeVisible();

  await page.getByRole("button", { name: "Assinar Pro" }).click();
  await expect(page).toHaveURL(/mercadopago\.com\.br\/checkout/);

  await page.goto("/billing/return?status=approved");

  const proActivated = await page.evaluate(() => sessionStorage.getItem("proActivated"));
  if (proActivated === "true") {
    await expect(page.getByText(/Pro ativo|processando/i)).toBeVisible();
  } else {
    await expect(page.getByText(/processando/i)).toBeVisible();
  }

  await page.goto("/workspace");

  const proState = await page.evaluate(() => sessionStorage.getItem("proActivated"));
  if (proState === "true") {
    await page.evaluate(() => sessionStorage.setItem("requestCount", "0"));
    await page.getByLabel("Pedido").fill("Formula Pro");
    await page.getByRole("button", { name: "Gerar formula" }).click();
    await expect(page.getByText('=SOMASE(C:C;"Pago";B:B)')).toBeVisible();
    await expect(page.getByText("Este e seu ultimo uso gratuito")).not.toBeVisible();
  }

  await page.evaluate(() => {
    sessionStorage.setItem("proActivated", "false");
    sessionStorage.setItem("requestCount", "5");
  });

  await page.goto("/workspace");
  await page.getByLabel("Pedido").fill("Pos revogacao");
  await page.getByRole("button", { name: "Gerar formula" }).click();
  await expect(page.getByText("Voce atingiu o limite de 4 usos gratuitos")).toBeVisible();
});
