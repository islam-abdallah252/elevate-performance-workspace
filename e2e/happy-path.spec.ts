import { expect, test } from "@playwright/test";

test("manager completes an evaluation and employee sees history", async ({ page, request }) => {
  const headers = { "X-Actor-User-Id": "director" };
  const suffix = Date.now();
  const templateResponse = await request.post("/api/kpi-templates", { headers, data: {
    name: `E2E Template ${suffix}`, description: "Browser acceptance template", status: "active",
    items: Array.from({ length: 10 }, (_, index) => ({ key: `Q${index + 1}`, expectedValue: 1, weight: 10, enabled: true })),
  } });
  expect(templateResponse.ok()).toBeTruthy();
  const template = (await templateResponse.json()).data;
  const userResponse = await request.post("/api/users", { headers, data: { name: `E2E Employee ${suffix}`, email: `e2e-${suffix}@test.local`, title: "Product Engineer", isManager: false, managerId: "director", status: "active", kpiTemplateId: null, kpiOverrides: [] } });
  expect(userResponse.ok()).toBeTruthy();
  const user = (await userResponse.json()).data;
  expect((await request.put(`/api/users/${user.id}/kpi-assignment`, { headers, data: { templateId: template.id, overrides: [] } })).ok()).toBeTruthy();
  const basePeriod = { type: "monthly", year: 2026, name: `October E2E ${suffix}`, startDate: "2026-10-01T00:00:00.000Z", endDate: "2026-10-31T23:59:59.000Z", status: "Draft", bonusFactor: 0 };
  const periodResponse = await request.post("/api/periods", { headers, data: basePeriod });
  const period = (await periodResponse.json()).data;
  await request.put(`/api/periods/${period.id}`, { headers, data: { ...basePeriod, status: "Published" } });
  await request.put(`/api/periods/${period.id}`, { headers, data: { ...basePeriod, status: "Active" } });
  const evaluationResponse = await request.post("/api/evaluations", { headers, data: { userId: user.id, periodId: period.id } });
  const evaluation = (await evaluationResponse.json()).data;

  await page.goto(`/evaluations/${evaluation.id}`);
  for (let index = 1; index <= 10; index += 1) await page.getByLabel(`Q${index} actual value`).fill("1");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("100.00%", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Submit evaluation" }).click();
  await expect(page.getByText("submitted", { exact: true })).toBeVisible();
  await page.getByLabel("Demo identity", { exact: true }).selectOption(user.id);
  await page.goto("/performance-history");
  await expect(page.getByRole("cell", { name: basePeriod.name, exact: true })).toBeVisible();
  await expect(page.getByText("100.00%", { exact: true }).first()).toBeVisible();
});
