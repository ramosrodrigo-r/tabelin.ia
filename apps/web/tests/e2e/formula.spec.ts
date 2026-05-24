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
      assumptions: ["A coluna B contem valores.", "A coluna C contem status."],
      warnings: [],
      metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "mock" }
    }
  }
]
  .map((event) => JSON.stringify(event))
  .join("\n");

const explainBody = [
  {
    type: "metadata",
    metadata: { mode: "explain", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "mock" }
  },
  { type: "delta", text: "1. Verifica o status Pago." },
  {
    type: "complete",
    payload: {
      kind: "explanation",
      formula: '=SOMASE(C:C;"Pago";B:B)',
      steps: ["Verifica quais linhas possuem Pago.", "Soma os valores correspondentes da coluna B."],
      assumptions: ["A coluna C contem status."],
      warnings: [],
      metadata: { mode: "explain", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "mock" }
    }
  }
]
  .map((event) => JSON.stringify(event))
  .join("\n");

test("formula MVP path streams within 2.5 seconds and copies output", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.route("**/api/tools/formula/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: `${generateBody}\n`
    });
  });
  await page.route("**/api/tools/formula/explain", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: `${explainBody}\n`
    });
  });

  await page.goto("/sign-up");
  await page.getByLabel("Nome").fill("Ana");
  await page.getByLabel("Email").fill(`ana-${Date.now()}@empresa.com`);
  await page.getByLabel("Senha").fill("senha-segura");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/workspace/);

  await expect(page.getByRole("heading", { name: "Workspace de formulas" })).toBeVisible();
  await expect(page.getByText("Formula").first()).toBeVisible();
  await expect(page.getByLabel("Plataforma")).toHaveValue("excel");
  await expect(page.getByRole("button", { name: /Portugues \(Brasil\)/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Pedido").fill("Quero somar a coluna B se a coluna C for Pago");
  const started = Date.now();
  await page.getByRole("button", { name: "Gerar formula" }).click();
  await expect(page.getByText('=SOMASE(C:C;"Pago";B:B)')).toBeVisible();
  expect(Date.now() - started).toBeLessThan(2500);
  await expect(page.getByText("Separador ;")).toBeVisible();
  await expect(page.getByText("A coluna B contem valores.")).toBeVisible();

  await page.getByRole("button", { name: "Copiar resultado" }).click();
  await expect(page.getByRole("button", { name: "Copiado" })).toBeVisible();

  await page.getByRole("tab", { name: "Explicar formula" }).click();
  await page.getByRole("textbox", { name: "Formula" }).fill('=SOMASE(C:C;"Pago";B:B)');
  await page.getByRole("button", { name: "Explicar formula" }).click();
  await expect(page.getByText("Verifica quais linhas possuem Pago.")).toBeVisible();
});
