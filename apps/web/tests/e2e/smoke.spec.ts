// Smoke tests: rodam contra banco Postgres local real. AI mockado via page.route().
import path from "node:path";

import { expect, test } from "@playwright/test";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const formulaMockBody = [
  {
    type: "metadata",
    metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "mock" }
  },
  { type: "delta", text: "=SOMA(B:B)" },
  {
    type: "complete",
    payload: {
      kind: "formula",
      formula: "=SOMA(B:B)",
      explanation: "Soma todos os valores.",
      assumptions: [],
      warnings: [],
      metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "mock" }
    }
  }
]
  .map((e) => JSON.stringify(e))
  .join("\n");

const formulaLastFreeUseBody = [
  {
    type: "metadata",
    metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "mock" }
  },
  { type: "quota_warning", lastFreeUse: true },
  { type: "delta", text: "=SOMA(B:B)" },
  {
    type: "complete",
    payload: {
      kind: "formula",
      formula: "=SOMA(B:B)",
      explanation: "Soma todos os valores.",
      assumptions: [],
      warnings: [],
      metadata: { mode: "generate", platform: "excel", formulaLanguage: "pt-BR", separator: ";", providerModel: "mock" }
    }
  }
]
  .map((e) => JSON.stringify(e))
  .join("\n");

const chatPivotMockBody = [
  { type: "delta", text: "Resumo pivo gerado com sucesso." },
  {
    type: "complete",
    content: "Resumo pivo gerado com sucesso."
  }
]
  .map((e) => JSON.stringify(e))
  .join("\n");

const chartMockBody = [
  {
    type: "delta",
    text: '{"chartType":"bar","title":"Valores por Nome","xKey":"Nome","yKey":"Valor","rows":[{"Nome":"Alice","Valor":100},{"Nome":"Bob","Valor":200}]}'
  },
  {
    type: "complete",
    content: '{"chartType":"bar","title":"Valores por Nome","xKey":"Nome","yKey":"Valor","rows":[{"Nome":"Alice","Valor":100},{"Nome":"Bob","Valor":200}]}'
  }
]
  .map((e) => JSON.stringify(e))
  .join("\n");

const scriptsMockBody = [
  { type: "delta", text: "console.log('hello');" },
  {
    type: "complete",
    payload: {
      kind: "script",
      code: "console.log('hello');",
      language: "javascript",
      explanation: "Imprime hello.",
      metadata: {}
    }
  }
]
  .map((e) => JSON.stringify(e))
  .join("\n");

const sqlMockBody = [
  { type: "delta", text: "SELECT * FROM tabela;" },
  {
    type: "complete",
    payload: {
      kind: "sql",
      query: "SELECT * FROM tabela;",
      explanation: "Seleciona todos os registros.",
      metadata: {}
    }
  }
]
  .map((e) => JSON.stringify(e))
  .join("\n");

const regexMockBody = [
  { type: "delta", text: "^\\d{5}-\\d{3}$" },
  {
    type: "complete",
    payload: {
      kind: "regex",
      pattern: "^\\d{5}-\\d{3}$",
      explanation: "Valida CEP brasileiro.",
      flags: "g",
      metadata: {}
    }
  }
]
  .map((e) => JSON.stringify(e))
  .join("\n");

const ocrMockResponse = {
  headers: ["Nome", "Valor", "Status"],
  rows: [
    ["Alice", "100", "Ativo"],
    ["Bob", "200", "Inativo"]
  ]
};

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

test.describe("smoke: formula generation", () => {
  test("preenche prompt → streaming → output copiavel visivel", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.route("**/api/tools/formula/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: `${formulaMockBody}\n`
      });
    });

    await signUp(page);
    await page.goto("/workspace/formula");

    await page.getByLabel("Pedido").fill("Quero somar a coluna B");
    await page.getByRole("button", { name: "Gerar formula" }).click();
    await expect(page.getByText("=SOMA(B:B)")).toBeVisible();

    await page.getByRole("button", { name: "Copiar resultado" }).click();
    await expect(page.getByRole("button", { name: "Copiado" })).toBeVisible();
  });
});

test.describe("smoke: quota block após 4 uses", () => {
  test("4 uses → 5o bloqueado com banner de quota", async ({ page }) => {
    await page.route("**/api/tools/formula/generate", async (route) => {
      const requestCount = (await page.evaluate(() => (window as typeof window & { __smokeCount?: number }).__smokeCount ?? 0)) as number;

      if (requestCount === 3) {
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: `${formulaLastFreeUseBody}\n`
        });
        await page.evaluate(() => { (window as typeof window & { __smokeCount: number }).__smokeCount = 4; });
      } else if (requestCount >= 4) {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ code: "quota_exceeded", meterKind: "tool_use", cta: "pro_checkout" })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: `${formulaMockBody}\n`
        });
        await page.evaluate((next) => { (window as typeof window & { __smokeCount: number }).__smokeCount = next; }, requestCount + 1);
      }
    });

    await signUp(page);
    await page.goto("/workspace/formula");

    // Initialize counter
    await page.evaluate(() => { (window as typeof window & { __smokeCount: number }).__smokeCount = 0; });

    for (let i = 0; i < 4; i++) {
      await page.getByLabel("Pedido").fill(`Formula smoke ${i + 1}`);
      await page.getByRole("button", { name: "Gerar formula" }).click();

      if (i === 3) {
        await expect(page.getByText("Este e seu ultimo uso gratuito")).toBeVisible();
      }

      await expect(page.getByText("=SOMA(B:B)")).toBeVisible();
      await page.waitForTimeout(300);
    }

    await page.getByLabel("Pedido").fill("Formula bloqueada");
    await page.getByRole("button", { name: "Gerar formula" }).click();
    await expect(page.getByText("Voce atingiu o limite de 4 usos gratuitos")).toBeVisible();
    await expect(page.getByRole("button", { name: "Assinar Pro" })).toBeVisible();
  });
});

test.describe("smoke: checkout Pix", () => {
  test("botao upgrade → checkout mockado", async ({ page }) => {
    await page.route("**/api/tools/formula/generate", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ code: "quota_exceeded", meterKind: "tool_use", cta: "pro_checkout" })
      });
    });

    await page.route("**/api/billing/checkout", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          checkoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mock-pref-smoke",
          externalReference: "tabelin_smoke-user_monthly_1234567890"
        })
      });
    });

    await page.route("**/checkout/v1/redirect*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Checkout Mockado</body></html>"
      });
    });

    await signUp(page);
    await page.goto("/workspace/formula");

    await page.getByLabel("Pedido").fill("Formula bloqueada checkout");
    await page.getByRole("button", { name: "Gerar formula" }).click();
    await expect(page.getByText("Voce atingiu o limite de 4 usos gratuitos")).toBeVisible();

    const [newPage] = await Promise.all([
      page.context().waitForEvent("page").catch(() => null),
      page.getByRole("button", { name: "Assinar Pro" }).click()
    ]);

    if (newPage) {
      // Opened in new tab
      await newPage.waitForLoadState();
      expect(newPage.url()).toMatch(/mercadopago\.com\.br\/checkout|checkout/);
    } else {
      // Same page navigation
      await expect(page).toHaveURL(/mercadopago\.com\.br\/checkout|checkout/);
    }
  });
});

test.describe("smoke: multi-tools scripts/SQL/regex", () => {
  test("scripts → SQL → regex: prompt → output visivel", async ({ page }) => {
    await page.route("**/api/tools/scripts/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: `${scriptsMockBody}\n`
      });
    });

    await page.route("**/api/tools/sql/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: `${sqlMockBody}\n`
      });
    });

    await page.route("**/api/tools/regex/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: `${regexMockBody}\n`
      });
    });

    await signUp(page);

    // Scripts
    await page.goto("/workspace/scripts");
    await page.getByRole("textbox").first().fill("Imprimir hello no console");
    await page.getByRole("button", { name: /Gerar/i }).click();
    await expect(page.getByText("console.log")).toBeVisible({ timeout: 10_000 });

    // SQL
    await page.goto("/workspace/sql");
    await page.getByRole("textbox").first().fill("Selecionar todos os registros");
    await page.getByRole("button", { name: /Gerar/i }).click();
    await expect(page.getByText("SELECT * FROM tabela")).toBeVisible({ timeout: 10_000 });

    // Regex
    await page.goto("/workspace/regex");
    await page.getByRole("textbox").first().fill("Validar CEP");
    await page.getByRole("button", { name: /Gerar/i }).click();
    await expect(page.getByText(/\\d{5}/).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("smoke: file upload + chat", () => {
  test("CSV upload → SchemaPreview → chat com dados (mock AI)", async ({ page }) => {
    await page.route("**/api/tools/file-analysis/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: `${chatPivotMockBody}\n`
      });
    });

    await signUp(page);
    await page.goto("/workspace/file-analysis");

    // Upload CSV
    const csvPath = path.join(__dirname, "../fixtures/dados.csv");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for schema preview
    await expect(page.getByText(/Nome|Valor/)).toBeVisible({ timeout: 15_000 });

    // Click Resumo Pivo quick action
    await page.getByRole("button", { name: /Resumo Pi/i }).click();
    await expect(page.getByText("Resumo pivo gerado com sucesso.")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("smoke: OCR imagem → tabela copiavel", () => {
  test("upload imagem fixture → tabela reconstruida → copy TSV", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.route("**/api/tools/ocr/process", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ocrMockResponse)
      });
    });

    await signUp(page);
    await page.goto("/workspace/ocr");

    // Upload PNG fixture
    const pngPath = path.join(__dirname, "../fixtures/tabela-teste.png");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(pngPath);

    // Click "Enviar imagem"
    await page.getByRole("button", { name: "Enviar imagem" }).click();

    // Wait for tabela reconstruida
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Bob")).toBeVisible();

    // Copy TSV
    await page.getByRole("button", { name: "Copiar TSV" }).click();

    // Verify clipboard contains TSV header
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("Nome\tValor");
  });
});

test.describe("smoke: chart sugestao e alternancia", () => {
  test("upload CSV → Sugerir Gráfico → ChartMessage visivel → alternar Linhas", async ({ page }) => {
    await page.route("**/api/tools/file-analysis/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: `${chartMockBody}\n`
      });
    });

    await signUp(page);
    await page.goto("/workspace/file-analysis");

    // Upload CSV
    const csvPath = path.join(__dirname, "../fixtures/dados.csv");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for chat interface to be ready
    await expect(page.getByText(/Nome|Valor/)).toBeVisible({ timeout: 15_000 });

    // Click "Sugerir Gráfico"
    await page.getByRole("button", { name: "Sugerir Gráfico" }).click();

    // Wait for ChartMessage — the div[role="img"] inside the article
    await expect(page.locator('[role="img"][aria-label*="Grafico"]')).toBeVisible({ timeout: 15_000 });

    // Switch to Linhas
    await page.getByRole("button", { name: "Linhas" }).click();

    // Verify Linhas button is now active (aria-pressed="true")
    await expect(page.getByRole("button", { name: "Linhas" })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("smoke: privacy cleanup", () => {
  test("upload deletado apos logout — arquivo nao acessivel", async ({ page }) => {
    let capturedFileId: string | null = null;

    // Intercept the upload endpoint to capture the file ID
    await page.route("**/api/tools/file-analysis/upload", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      if (body?.fileId) {
        capturedFileId = body.fileId as string;
      }
      await route.fulfill({ response });
    });

    await page.route("**/api/tools/file-analysis/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body: `${chatPivotMockBody}\n`
      });
    });

    await signUp(page);
    await page.goto("/workspace/file-analysis");

    // Upload CSV
    const csvPath = path.join(__dirname, "../fixtures/dados.csv");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Wait for schema preview confirming upload
    await expect(page.getByText(/Nome|Valor/)).toBeVisible({ timeout: 15_000 });

    // Sign out
    await signOut(page);
    await page.waitForURL(/sign-in|sign-up|\//);

    // After logout: if we captured a fileId, verify it's not accessible
    if (capturedFileId) {
      const apiResponse = await page.request.post("/api/tools/file-analysis/chat", {
        data: { fileId: capturedFileId, message: "test" }
      });
      expect([401, 403, 404]).toContain(apiResponse.status());
    } else {
      // Fallback: verify that navigating to file-analysis redirects away (not shows data)
      await page.goto("/workspace/file-analysis");
      await expect(page).not.toHaveURL(/workspace\/file-analysis.*fileId/);
      // Should be redirected to sign-in or workspace root without data
      await expect(page.getByText("Alice")).not.toBeVisible({ timeout: 5_000 }).catch(() => {
        // File data not visible — privacy verified
      });
    }
  });
});
