import { randomUUID } from "node:crypto";
import type {
  AuditLog, DashboardData, Evaluation, EvaluationKpi, KpiKey, KpiKeyInput, KpiOverride,
  KpiTemplate, Period, PeriodInput, TemplateInput, User, UserInput,
} from "@kpi/contracts";
import { conflict, forbidden, invalid, notFound } from "../errors.js";
import { store } from "../repositories/store.js";
import { buildTeamTree, descendantIds } from "./hierarchy.js";
import { calculateBonus, calculateEvaluationScore, calculateKpiScore } from "./scoring.js";

const now = () => new Date().toISOString();
const isRoot = (user: User) => user.isManager && user.managerId === null;
const enabledWeight = (items: Array<{ enabled: boolean; weight: number }>) => items.filter((i) => i.enabled).reduce((s, i) => s + i.weight, 0);

async function audit(actorUserId: string, action: string, targetUserId: string | undefined, details: Record<string, unknown>) {
  const entry: AuditLog = { id: randomUUID(), actorUserId, action, targetUserId, timestamp: now(), details };
  await store.audits.create(entry);
}

async function actor(actorId: string): Promise<User> {
  const user = await store.users.getById(actorId);
  if (!user || user.status !== "active") throw forbidden("Select an active demo user");
  return user;
}

async function access(actorId: string, targetId: string, requireManager = false): Promise<{ actor: User; users: User[] }> {
  const users = await store.users.getAll();
  const current = users.find((u) => u.id === actorId);
  if (!current || current.status !== "active") throw forbidden("Select an active demo user");
  if (requireManager && !current.isManager) throw forbidden("Manager access is required");
  const allowed = current.id === targetId || isRoot(current) || descendantIds(users, current.id).has(targetId);
  if (!allowed) throw forbidden();
  return { actor: current, users };
}

function assertWeight(items: Array<{ enabled: boolean; weight: number }>) {
  if (Math.abs(enabledWeight(items) - 100) > 0.001) throw invalid("Enabled KPI weights must total 100%");
}

async function templateAccess(actorId: string, templateId: string): Promise<{ current: User; template: KpiTemplate; users: User[] }> {
  const current = await actor(actorId);
  if (!current.isManager) throw forbidden("Manager access is required");
  const [users, template] = await Promise.all([store.users.getAll(), store.templates.getById(templateId)]);
  if (!template) throw notFound("KPI template");
  const allowedOwners = descendantIds(users, current.id);
  if (!isRoot(current) && template.ownerUserId !== current.id && !allowedOwners.has(template.ownerUserId)) {
    throw forbidden("This KPI template is outside your management hierarchy");
  }
  return { current, template, users };
}

function visibleKeys(current: User, users: User[], keys: KpiKey[]): KpiKey[] {
  if (isRoot(current)) return keys;
  const owners = descendantIds(users, current.id);
  owners.add(current.id);
  return keys.filter((key) => key.ownerUserId === null || owners.has(key.ownerUserId));
}

async function keyAccess(actorId: string, keyCode: string): Promise<{ current: User; key: KpiKey; users: User[] }> {
  const current = await actor(actorId);
  if (!current.isManager) throw forbidden("Manager access is required");
  const [users, keys] = await Promise.all([store.users.getAll(), store.keys.getAll()]);
  const key = keys.find((item) => item.key === keyCode);
  if (!key) throw notFound("KPI key");
  if (!visibleKeys(current, users, [key]).length) throw forbidden("This KPI key is outside your management hierarchy");
  return { current, key, users };
}

async function assertTemplateKeyAccess(actorId: string, items: Array<{ key: string }>) {
  const current = await actor(actorId);
  if (!current.isManager) throw forbidden("Manager access is required");
  const [users, keys] = await Promise.all([store.users.getAll(), store.keys.getAll()]);
  const allowed = new Set(visibleKeys(current, users, keys).filter((key) => key.active).map((key) => key.key));
  const denied = items.find((item) => !allowed.has(item.key));
  if (denied) throw forbidden(`KPI key ${denied.key} is unavailable to this manager`);
}

async function resolveSnapshot(user: User): Promise<{ template: KpiTemplate; kpis: EvaluationKpi[] }> {
  if (!user.kpiTemplateId) throw invalid("Assign an active KPI template before creating an evaluation");
  const [template, storedKeys] = await Promise.all([store.templates.getById(user.kpiTemplateId), store.keys.getAll()]);
  if (!template || template.status !== "active") throw invalid("Assigned KPI template is not active");
  const overrides = new Map((user.kpiOverrides ?? []).map((item) => [item.key, item]));
  const resolved = template.items.map((item) => ({ ...item, ...(overrides.get(item.key) ?? {}) })).filter((item) => item.enabled);
  assertWeight(resolved);
  const kpis = resolved.map((item) => {
    const key = storedKeys.find((entry) => entry.key === item.key && entry.active);
    if (!key) throw invalid(`KPI key ${item.key} is missing or inactive`);
    return {
      key: key.key, name: key.name, description: key.description, dataType: key.dataType,
      expectedValue: item.expectedValue, weight: item.weight, actualValue: null, contribution: 0,
    } satisfies EvaluationKpi;
  });
  return { template, kpis };
}

export const appService = {
  async demoActors() { return (await store.users.getAll()).filter((user) => user.status === "active"); },
  async session(actorId: string) { return actor(actorId); },

  async users(actorId: string) {
    const current = await actor(actorId);
    const users = await store.users.getAll();
    if (isRoot(current)) return users;
    if (current.isManager) {
      const ids = descendantIds(users, current.id);
      return users.filter((user) => user.id === current.id || ids.has(user.id));
    }
    return users.filter((user) => user.id === current.id);
  },

  async user(actorId: string, id: string) {
    await access(actorId, id);
    return (await store.users.getById(id)) ?? Promise.reject(notFound("User"));
  },

  async createUser(actorId: string, input: UserInput) {
    const current = await actor(actorId);
    if (!current.isManager) throw forbidden("Manager access is required");
    const users = await store.users.getAll();
    if (users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) throw conflict("Email is already in use");
    if (!input.managerId) {
      if (!isRoot(current)) throw forbidden("Only a root manager can create another root user");
    } else {
      const manager = users.find((user) => user.id === input.managerId);
      if (!manager?.isManager || manager.status !== "active") throw invalid("Selected manager is not active or is not a manager");
      if (!isRoot(current) && manager.id !== current.id && !descendantIds(users, current.id).has(manager.id)) throw forbidden();
    }
    const timestamp = now();
    const created: User = { ...input, id: randomUUID(), kpiTemplateId: input.kpiTemplateId ?? null, kpiOverrides: input.kpiOverrides ?? [], createdAt: timestamp, updatedAt: timestamp };
    await store.users.create(created);
    await audit(actorId, "USER_CREATED", created.id, { after: created });
    return created;
  },

  async updateUser(actorId: string, id: string, input: UserInput) {
    const { users } = await access(actorId, id, true);
    const before = users.find((user) => user.id === id)!;
    if (users.some((user) => user.id !== id && user.email.toLowerCase() === input.email.toLowerCase())) throw conflict("Email is already in use");
    const reports = users.filter((user) => user.managerId === id);
    if ((!input.isManager || input.status === "inactive") && reports.length) throw conflict("Reassign direct reports before disabling or deactivating this manager");
    if (input.managerId === id) throw invalid("A user cannot manage themselves");
    if (input.managerId && descendantIds(users, id).has(input.managerId)) throw conflict("This manager assignment would create a cycle");
    if (input.managerId) {
      const manager = users.find((user) => user.id === input.managerId);
      if (!manager?.isManager || manager.status !== "active") throw invalid("Selected manager is not active or is not a manager");
    }
    const updated = await store.users.update(id, () => ({ ...before, ...input, id, updatedAt: now() }));
    await audit(actorId, before.isManager !== input.isManager ? "MANAGER_STATUS_CHANGED" : "USER_UPDATED", id, { before, after: updated });
    return updated!;
  },

  async assignTemplate(actorId: string, id: string, templateId: string, overrides: KpiOverride[]) {
    await access(actorId, id, true);
    const user = (await store.users.getById(id))!;
    const { template } = await templateAccess(actorId, templateId);
    if (template.status !== "active") throw invalid("Template must be active");
    const allowedKeys = new Set(template.items.map((item) => item.key));
    if (overrides.some((item) => !allowedKeys.has(item.key))) throw invalid("Override contains a key outside the template");
    const candidate = { ...user, kpiTemplateId: templateId, kpiOverrides: overrides, updatedAt: now() };
    await resolveSnapshot(candidate);
    await store.users.update(id, () => candidate);
    await audit(actorId, "KPI_ASSIGNMENT_UPDATED", id, { templateId, overrides });
    return candidate;
  },

  async children(actorId: string, id: string) {
    const { users } = await access(actorId, id);
    return users.filter((user) => user.managerId === id);
  },

  async team(actorId: string, id: string) {
    const { users } = await access(actorId, id);
    return buildTeamTree(users, id);
  },

  async keys(actorId: string) {
    const current = await actor(actorId);
    if (!current.isManager) throw forbidden("Manager access is required");
    const [users, keys] = await Promise.all([store.users.getAll(), store.keys.getAll()]);
    return visibleKeys(current, users, keys);
  },
  async key(actorId: string, key: string) {
    return (await keyAccess(actorId, key)).key;
  },
  async createKey(actorId: string, input: KpiKeyInput) {
    const current = await actor(actorId);
    if (!current.isManager) throw forbidden("Manager access is required");
    const keys = await store.keys.getAll();
    if (keys.some((item) => item.key === input.key)) throw conflict(`KPI key ${input.key} already exists`);
    const timestamp = now();
    const created: KpiKey = { ...input, id: randomUUID(), ownerUserId: actorId, createdAt: timestamp, updatedAt: timestamp };
    await store.keys.create(created);
    await audit(actorId, "KPI_KEY_CREATED", undefined, { key: created.key, ownerUserId: actorId });
    return created;
  },
  async updateKey(actorId: string, key: string, input: Omit<KpiKeyInput, "key">) {
    const { current, key: found } = await keyAccess(actorId, key);
    if (found.ownerUserId === null && !isRoot(current)) throw forbidden("Only a root manager can edit system KPI keys");
    const updated = await store.keys.update(found.id, () => ({ ...found, ...input, key, id: found.id, updatedAt: now() }));
    await audit(actorId, "KPI_KEY_UPDATED", undefined, { key, before: found, after: updated });
    return updated!;
  },
  async deleteKey(actorId: string, key: string) {
    const { key: found } = await keyAccess(actorId, key);
    if (found.ownerUserId === null) throw conflict("System KPI keys cannot be deleted");
    const [templates, evaluations] = await Promise.all([store.templates.getAll(), store.evaluations.getAll()]);
    if (templates.some((template) => template.items.some((item) => item.key === key)) || evaluations.some((evaluation) => evaluation.kpis.some((item) => item.key === key))) {
      throw conflict("This KPI key is referenced by a template or evaluation and cannot be deleted");
    }
    await store.keys.delete(found.id);
    await audit(actorId, "KPI_KEY_DELETED", undefined, { key, ownerUserId: found.ownerUserId });
    return found;
  },

  async templates(actorId: string) {
    const current = await actor(actorId);
    if (!current.isManager) throw forbidden("Manager access is required");
    const [users, templates] = await Promise.all([store.users.getAll(), store.templates.getAll()]);
    if (isRoot(current)) return templates;
    const owners = descendantIds(users, current.id); owners.add(current.id);
    return templates.filter((template) => owners.has(template.ownerUserId));
  },
  async template(actorId: string, id: string) {
    return (await templateAccess(actorId, id)).template;
  },
  async createTemplate(actorId: string, input: TemplateInput) {
    const current = await actor(actorId);
    if (!current.isManager) throw forbidden("Manager access is required");
    await assertTemplateKeyAccess(actorId, input.items);
    if (input.status === "active") assertWeight(input.items);
    const timestamp = now();
    const created: KpiTemplate = { ...input, id: randomUUID(), ownerUserId: actorId, createdAt: timestamp, updatedAt: timestamp };
    await store.templates.create(created);
    await audit(actorId, "KPI_CONFIGURATION_CREATED", undefined, { templateId: created.id });
    return created;
  },
  async updateTemplate(actorId: string, id: string, input: TemplateInput) {
    const { template: before } = await templateAccess(actorId, id);
    await assertTemplateKeyAccess(actorId, input.items);
    if (input.status === "active") assertWeight(input.items);
    const updated = await store.templates.update(id, () => ({ ...before, ...input, id, updatedAt: now() }));
    await audit(actorId, "KPI_CONFIGURATION_UPDATED", undefined, { templateId: id, before, after: updated });
    return updated!;
  },
  async deleteTemplate(actorId: string, id: string) {
    const { template } = await templateAccess(actorId, id);
    const [users, evaluations] = await Promise.all([store.users.getAll(), store.evaluations.getAll()]);
    if (users.some((user) => user.kpiTemplateId === id) || evaluations.some((evaluation) => evaluation.templateId === id)) {
      throw conflict("This template is assigned or referenced by an evaluation and cannot be deleted");
    }
    await store.templates.delete(id);
    await audit(actorId, "KPI_CONFIGURATION_DELETED", undefined, { templateId: id, ownerUserId: template.ownerUserId });
    return template;
  },

  async periods(actorId: string) { await actor(actorId); return store.periods.getAll(); },
  async createPeriod(actorId: string, input: PeriodInput) {
    const current = await actor(actorId); if (!isRoot(current)) throw forbidden("Root manager access is required");
    if (new Date(input.endDate) <= new Date(input.startDate)) throw invalid("End date must be after start date");
    const timestamp = now();
    const created: Period = { ...input, id: randomUUID(), bonusFactor: input.bonusFactor ?? (input.type === "quarterly" ? 0.25 : 0), createdAt: timestamp, updatedAt: timestamp };
    await store.periods.create(created); await audit(actorId, "PERIOD_CREATED", undefined, { periodId: created.id }); return created;
  },
  async updatePeriod(actorId: string, id: string, input: PeriodInput) {
    const current = await actor(actorId); if (!isRoot(current)) throw forbidden("Root manager access is required");
    const before = await store.periods.getById(id); if (!before) throw notFound("Period");
    if (["Closed", "Archived"].includes(before.status)) throw conflict("Closed or archived periods are read-only");
    const order = ["Draft", "Published", "Active", "Closed", "Archived"];
    if (order.indexOf(input.status) < order.indexOf(before.status)) throw conflict("Period status cannot move backwards");
    if (order.indexOf(input.status) > order.indexOf(before.status) + 1) throw conflict("Period status must advance one step at a time");
    const updated = await store.periods.update(id, () => ({ ...before, ...input, id, bonusFactor: input.bonusFactor ?? before.bonusFactor, updatedAt: now() }));
    await audit(actorId, "PERIOD_UPDATED", undefined, { periodId: id, before, after: updated }); return updated!;
  },

  async evaluations(actorId: string, userId?: string) {
    const current = await actor(actorId); const users = await store.users.getAll();
    const allowed = isRoot(current) ? new Set(users.map((u) => u.id)) : current.isManager ? new Set([current.id, ...descendantIds(users, current.id)]) : new Set([current.id]);
    if (userId && !allowed.has(userId)) throw forbidden();
    return (await store.evaluations.getAll()).filter((evaluation) => allowed.has(evaluation.userId) && (!userId || evaluation.userId === userId));
  },
  async evaluation(actorId: string, id: string) {
    const evaluation = await store.evaluations.getById(id); if (!evaluation) throw notFound("Evaluation");
    await access(actorId, evaluation.userId); return evaluation;
  },
  async createEvaluation(actorId: string, userId: string, periodId: string) {
    await access(actorId, userId, true);
    const [user, period, existing] = await Promise.all([store.users.getById(userId), store.periods.getById(periodId), store.evaluations.getAll()]);
    if (!user) throw notFound("User"); if (!period) throw notFound("Period");
    if (period.status !== "Active") throw conflict("Evaluations can only be created for an active period");
    if (existing.some((evaluation) => evaluation.userId === userId && evaluation.periodId === periodId)) throw conflict("An evaluation already exists for this user and period");
    const { template, kpis } = await resolveSnapshot(user);
    await templateAccess(actorId, template.id);
    const timestamp = now();
    const created: Evaluation = { id: randomUUID(), userId, periodId, templateId: template.id, kpis, totalScore: 0, bonusPercentage: 0, status: "draft", createdBy: actorId, createdAt: timestamp, updatedAt: timestamp };
    await store.evaluations.create(created); await audit(actorId, "EVALUATION_CREATED", userId, { evaluationId: created.id }); return created;
  },
  async updateEvaluation(actorId: string, id: string, actualValues: Record<string, number | null>) {
    const before = await store.evaluations.getById(id); if (!before) throw notFound("Evaluation");
    await access(actorId, before.userId, true); const period = await store.periods.getById(before.periodId);
    if (before.status !== "draft" || !period || ["Closed", "Archived"].includes(period.status)) throw conflict("This evaluation is read-only");
    const kpis = before.kpis.map((kpi) => {
      const actualValue = Object.hasOwn(actualValues, kpi.key) ? actualValues[kpi.key] : kpi.actualValue;
      if (kpi.dataType === "percentage" && actualValue !== null && actualValue > 100) throw invalid(`${kpi.key} cannot exceed 100%`);
      return { ...kpi, actualValue, contribution: calculateKpiScore(actualValue, kpi.expectedValue, kpi.weight) };
    });
    const totalScore = calculateEvaluationScore(kpis); const updated = { ...before, kpis, totalScore, bonusPercentage: calculateBonus(totalScore, period.bonusFactor), updatedAt: now() };
    await store.evaluations.update(id, () => updated); await audit(actorId, "KPI_ACTUAL_VALUE_CHANGED", before.userId, { evaluationId: id, actualValues }); return updated;
  },
  async transitionEvaluation(actorId: string, id: string, action: "submit" | "close") {
    const before = await store.evaluations.getById(id); if (!before) throw notFound("Evaluation"); await access(actorId, before.userId, true);
    if (action === "submit" && (before.status !== "draft" || before.kpis.some((kpi) => kpi.actualValue === null))) throw conflict("Complete every KPI before submitting");
    if (action === "close" && before.status !== "submitted") throw conflict("Only submitted evaluations can be closed");
    const status = action === "submit" ? "submitted" : "closed"; const updated = { ...before, status, updatedAt: now() } as Evaluation;
    await store.evaluations.update(id, () => updated); await audit(actorId, action === "submit" ? "EVALUATION_SUBMITTED" : "EVALUATION_CLOSED", before.userId, { evaluationId: id }); return updated;
  },

  async history(actorId: string, userId: string) {
    await access(actorId, userId); const [evaluations, periods] = await Promise.all([store.evaluations.getAll(), store.periods.getAll()]);
    return evaluations.filter((item) => item.userId === userId && item.status !== "draft").map((evaluation) => ({ evaluation, period: periods.find((period) => period.id === evaluation.periodId)! })).filter((item) => item.period).sort((a, b) => a.period.startDate.localeCompare(b.period.startDate));
  },
  async dashboard(actorId: string): Promise<DashboardData> {
    const current = await actor(actorId); const [users, periods, evaluations] = await Promise.all([store.users.getAll(), store.periods.getAll(), store.evaluations.getAll()]);
    const currentPeriod = periods.find((period) => period.status === "Active") ?? periods.filter((period) => period.status === "Closed").sort((a, b) => b.endDate.localeCompare(a.endDate))[0] ?? null;
    const history = evaluations.filter((e) => e.userId === current.id && e.status !== "draft").map((evaluation) => ({ evaluation, period: periods.find((p) => p.id === evaluation.periodId)! })).filter((point) => point.period).sort((a, b) => a.period.startDate.localeCompare(b.period.startDate));
    const currentEvaluation = currentPeriod ? evaluations.find((evaluation) => evaluation.userId === current.id && evaluation.periodId === currentPeriod.id) ?? null : null;
    const result: DashboardData = { actor: current, currentPeriod, currentEvaluation, history };
    if (current.isManager) {
      const ids = descendantIds(users, current.id); const teamUsers = users.filter((user) => ids.has(user.id));
      const team = teamUsers.map((user) => ({ user, evaluation: currentPeriod ? evaluations.find((e) => e.userId === user.id && e.periodId === currentPeriod.id) ?? null : null }));
      const completedScores = team.map((row) => row.evaluation).filter((e): e is Evaluation => !!e && e.status !== "draft").map((e) => e.totalScore);
      result.team = team; result.metrics = { directReports: users.filter((u) => u.managerId === current.id).length, managersBelow: teamUsers.filter((u) => u.isManager).length, completed: completedScores.length, pending: team.length - completedScores.length, teamAverage: completedScores.length ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length * 100) / 100 : 0 };
    }
    return result;
  },
  async audits(actorId: string) { const current = await actor(actorId); if (!isRoot(current)) throw forbidden("Root manager access is required"); return store.audits.getAll(); },
};
