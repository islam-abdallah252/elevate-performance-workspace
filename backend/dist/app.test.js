import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { seedData } from "./seed-data.js";
const app = createApp();
const as = (id) => ({ "X-Actor-User-Id": id });
const templateInput = (name) => ({
    name, description: "Authorization test template", status: "active",
    items: Array.from({ length: 10 }, (_, index) => ({ key: `Q${index + 1}`, expectedValue: 1, weight: 10, enabled: true })),
});
beforeAll(() => seedData(true));
describe("KPI API", () => {
    it("requires a demo actor on protected endpoints", async () => {
        const response = await request(app).get("/api/dashboard");
        expect(response.status).toBe(400);
    });
    it("enforces hierarchy access", async () => {
        expect((await request(app).get("/api/users/islam").set(as("ahmed"))).status).toBe(403);
        const response = await request(app).get("/api/users/manager-a/team").set(as("manager-a"));
        expect(response.status).toBe(200);
        expect(response.body.data[0].name).toBe("Islam Abdallah");
    });
    it("runs create, assign, evaluate, submit, and history flow", async () => {
        const created = await request(app).post("/api/users").set(as("manager-a")).send({ name: "Test Employee", email: "flow@test.local", title: "Engineer", isManager: false, managerId: "manager-a", status: "active", kpiTemplateId: null, kpiOverrides: [] });
        expect(created.status).toBe(201);
        const userId = created.body.data.id;
        expect((await request(app).put(`/api/users/${userId}/kpi-assignment`).set(as("manager-a")).send({ templateId: "tpl-engineering", overrides: [] })).status).toBe(200);
        const evaluation = await request(app).post("/api/evaluations").set(as("manager-a")).send({ userId, periodId: "q3-2026" });
        expect(evaluation.status).toBe(201);
        const id = evaluation.body.data.id;
        const actualValues = Object.fromEntries(evaluation.body.data.kpis.map((kpi) => [kpi.key, kpi.expectedValue]));
        const scored = await request(app).put(`/api/evaluations/${id}`).set(as("manager-a")).send({ actualValues });
        expect(scored.body.data.totalScore).toBe(100);
        expect((await request(app).post(`/api/evaluations/${id}/submit`).set(as("manager-a")).send({})).status).toBe(200);
        const history = await request(app).get(`/api/users/${userId}/performance-history`).set(as(userId));
        expect(history.body.data).toHaveLength(1);
    });
    it("keeps closed evaluations immutable", async () => {
        const response = await request(app).put("/api/evaluations/eval-islam-q1").set(as("manager-a")).send({ actualValues: { Q1: 1 } });
        expect(response.status).toBe(409);
    });
    it("keeps evaluation snapshots unchanged when a template changes", async () => {
        const template = (await request(app).get("/api/kpi-templates/tpl-engineering").set(as("manager-a"))).body.data;
        template.items[0].expectedValue = 99;
        const changed = await request(app).put("/api/kpi-templates/tpl-engineering").set(as("manager-a")).send({ name: template.name, description: template.description, status: template.status, items: template.items });
        expect(changed.status).toBe(200);
        const historical = await request(app).get("/api/evaluations/eval-islam-q1").set(as("manager-a"));
        expect(historical.body.data.kpis[0].expectedValue).toBe(3);
    });
    it("lets Manager A see their own template", async () => {
        const response = await request(app).get("/api/kpi-templates").set(as("manager-a"));
        expect(response.status).toBe(200);
        expect(response.body.data.map((item) => item.id)).toContain("tpl-engineering");
    });
    it("lets an unrelated Manager B see their own template", async () => {
        const response = await request(app).get("/api/kpi-templates").set(as("manager-c"));
        expect(response.status).toBe(200);
        expect(response.body.data.map((item) => item.id)).toContain("tpl-quality");
    });
    it("does not expose Manager B's unrelated template to Manager A", async () => {
        const response = await request(app).get("/api/kpi-templates").set(as("manager-a"));
        expect(response.body.data.map((item) => item.id)).not.toContain("tpl-quality");
    });
    it("does not expose Manager A's template to unrelated Manager B", async () => {
        const response = await request(app).get("/api/kpi-templates").set(as("manager-c"));
        expect(response.body.data.map((item) => item.id)).not.toContain("tpl-engineering");
    });
    it("lets a parent manager list descendant manager templates", async () => {
        const response = await request(app).get("/api/kpi-templates").set(as("manager-a"));
        expect(response.body.data.map((item) => item.id)).toContain("tpl-platform");
    });
    it("lets a parent manager access and update descendant templates", async () => {
        const detail = await request(app).get("/api/kpi-templates/tpl-platform").set(as("manager-a"));
        expect(detail.status).toBe(200);
        const value = detail.body.data;
        const updated = await request(app).put("/api/kpi-templates/tpl-platform").set(as("manager-a")).send({ name: value.name, description: "Updated by parent manager", status: value.status, items: value.items });
        expect(updated.status).toBe(200);
        expect(updated.body.data.ownerUserId).toBe("manager-b");
    });
    it("rejects assigning an unrelated template to a user in the actor's subtree", async () => {
        const response = await request(app).put("/api/users/islam/kpi-assignment").set(as("manager-a")).send({ templateId: "tpl-quality", overrides: [] });
        expect(response.status).toBe(403);
    });
    it("returns 403 for direct get, update, and delete of an unauthorized template", async () => {
        expect((await request(app).get("/api/kpi-templates/tpl-quality").set(as("manager-a"))).status).toBe(403);
        expect((await request(app).put("/api/kpi-templates/tpl-quality").set(as("manager-a")).send(templateInput("Spoof update"))).status).toBe(403);
        expect((await request(app).delete("/api/kpi-templates/tpl-quality").set(as("manager-a"))).status).toBe(403);
    });
    it("derives ownerUserId from the actor and ignores spoofed ownership", async () => {
        const response = await request(app).post("/api/kpi-templates").set(as("manager-a")).send({ ...templateInput("Owned by actor"), ownerUserId: "manager-c" });
        expect(response.status).toBe(201);
        expect(response.body.data.ownerUserId).toBe("manager-a");
    });
    it("denies regular users access to template management APIs", async () => {
        expect((await request(app).get("/api/kpi-templates").set(as("islam"))).status).toBe(403);
        expect((await request(app).get("/api/kpi-templates/tpl-engineering").set(as("islam"))).status).toBe(403);
        expect((await request(app).post("/api/kpi-templates").set(as("islam")).send(templateInput("Employee template"))).status).toBe(403);
        expect((await request(app).put("/api/kpi-templates/tpl-engineering").set(as("islam")).send(templateInput("Employee update"))).status).toBe(403);
        expect((await request(app).delete("/api/kpi-templates/tpl-engineering").set(as("islam"))).status).toBe(403);
    });
    it("scopes manager-owned KPI keys to the actor's hierarchy", async () => {
        const parent = await request(app).get("/api/kpi-keys").set(as("manager-a"));
        const unrelated = await request(app).get("/api/kpi-keys").set(as("manager-c"));
        const parentCodes = parent.body.data.map((item) => item.key);
        const unrelatedCodes = unrelated.body.data.map((item) => item.key);
        expect(parentCodes).toContain("PLATFORM_UPTIME");
        expect(parentCodes).not.toContain("DEFECT_ESCAPE");
        expect(unrelatedCodes).toContain("DEFECT_ESCAPE");
        expect(unrelatedCodes).not.toContain("PLATFORM_UPTIME");
        expect(parentCodes).toContain("Q1");
        expect(unrelatedCodes).toContain("Q1");
    });
    it("derives KPI key ownership from the current actor", async () => {
        const response = await request(app).post("/api/kpi-keys").set(as("manager-a")).send({ key: "CUSTOM_VELOCITY", name: "Custom Velocity", description: "Tracks manager-defined delivery velocity.", dataType: "number", active: true, ownerUserId: "manager-c" });
        expect(response.status).toBe(201);
        expect(response.body.data.key).toBe("CUSTOM_VELOCITY");
        expect(response.body.data.ownerUserId).toBe("manager-a");
    });
    it("allows a parent manager to access and edit descendant-owned KPI keys", async () => {
        const detail = await request(app).get("/api/kpi-keys/PLATFORM_UPTIME").set(as("manager-a"));
        expect(detail.status).toBe(200);
        const updated = await request(app).put("/api/kpi-keys/PLATFORM_UPTIME").set(as("manager-a")).send({ name: "Platform Availability", description: "Updated by an authorized parent manager.", dataType: "percentage", active: true });
        expect(updated.status).toBe(200);
        expect(updated.body.data.ownerUserId).toBe("manager-b");
        expect(updated.body.data.key).toBe("PLATFORM_UPTIME");
    });
    it("returns 403 for unrelated KPI key access and use in templates", async () => {
        expect((await request(app).get("/api/kpi-keys/DEFECT_ESCAPE").set(as("manager-a"))).status).toBe(403);
        expect((await request(app).put("/api/kpi-keys/DEFECT_ESCAPE").set(as("manager-a")).send({ name: "No access", description: "Unauthorized update attempt.", dataType: "percentage", active: true })).status).toBe(403);
        expect((await request(app).delete("/api/kpi-keys/DEFECT_ESCAPE").set(as("manager-a"))).status).toBe(403);
        const template = await request(app).post("/api/kpi-templates").set(as("manager-a")).send({ name: "Unauthorized key template", description: "Must be rejected", status: "active", items: [{ key: "DEFECT_ESCAPE", expectedValue: 1, weight: 100, enabled: true }] });
        expect(template.status).toBe(403);
    });
    it("denies regular employees access to KPI library management APIs", async () => {
        expect((await request(app).get("/api/kpi-keys").set(as("islam"))).status).toBe(403);
        expect((await request(app).get("/api/kpi-keys/Q1").set(as("islam"))).status).toBe(403);
        expect((await request(app).post("/api/kpi-keys").set(as("islam")).send({ key: "EMPLOYEE_KEY", name: "Employee key", description: "Not allowed for employees.", dataType: "score", active: true })).status).toBe(403);
    });
    it("allows authorized deletion only for unused custom keys", async () => {
        const created = await request(app).post("/api/kpi-keys").set(as("manager-b")).send({ key: "TEMP_PLATFORM_KEY", name: "Temporary Platform Key", description: "Used to verify authorized deletion.", dataType: "score", active: true });
        expect(created.status).toBe(201);
        expect((await request(app).delete("/api/kpi-keys/TEMP_PLATFORM_KEY").set(as("manager-a"))).status).toBe(200);
        expect((await request(app).delete("/api/kpi-keys/Q1").set(as("director"))).status).toBe(409);
    });
});
