import { test, expect } from "@playwright/test";

/**
 * WG-003 e2e: end-to-end-flow zonder mocks. Loader.js bootstrap → klik
 * trigger → modal → kies type → vul beschrijving → submit → succes-toast.
 *
 * Test-host injecteert een test-pattern in de beschrijving (>10 tekens en
 * matcht 'test') zodat WG-001's classifier het issue als label `'test'`
 * tagt. DevHub-triage filtert dat label uit de UI; we vervuilen dus geen
 * productie-state.
 */
test("widget submit creates a DevHub issue end-to-end", async ({ page }) => {
  await page.goto("/");

  // Loader injecteert een Shadow Host met de feedback-knop. We pakken 'm
  // via aria-label zodat we niet aan implementatie-details vasthangen.
  const trigger = page.locator("#__jaip-widget-host").getByRole("button", { name: /feedback/i });
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await trigger.click();

  // Modal opent in dezelfde Shadow Root. Type-knop "Bug" selecteren.
  const dialog = page.locator("#__jaip-widget-host").getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: /^bug:/i }).click();

  await dialog
    .getByRole("textbox", { name: /beschrijving/i })
    .fill("E2E test bug — automated playwright run, please ignore in triage");

  await dialog.getByRole("button", { name: /^versturen$/i }).click();

  await expect(dialog.getByText(/bedankt!/i)).toBeVisible({ timeout: 10_000 });
});

test("modal closes on Escape key", async ({ page }) => {
  await page.goto("/");

  const trigger = page.locator("#__jaip-widget-host").getByRole("button", { name: /feedback/i });
  await trigger.click();

  const dialog = page.locator("#__jaip-widget-host").getByRole("dialog");
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("submit blijft disabled tot type én ≥10 tekens beschrijving", async ({ page }) => {
  await page.goto("/");

  await page
    .locator("#__jaip-widget-host")
    .getByRole("button", { name: /feedback/i })
    .click();

  const dialog = page.locator("#__jaip-widget-host").getByRole("dialog");
  const submit = dialog.getByRole("button", { name: /^versturen$/i });

  // Geen type, geen beschrijving → disabled
  await expect(submit).toBeDisabled();

  // Type wel, beschrijving te kort → nog steeds disabled
  await dialog.getByRole("button", { name: /^bug:/i }).click();
  await dialog.getByRole("textbox", { name: /beschrijving/i }).fill("kort");
  await expect(submit).toBeDisabled();

  // Beschrijving boven minimum → enabled
  await dialog
    .getByRole("textbox", { name: /beschrijving/i })
    .fill("dit is lang genoeg om de submit-knop te activeren");
  await expect(submit).toBeEnabled();
});
