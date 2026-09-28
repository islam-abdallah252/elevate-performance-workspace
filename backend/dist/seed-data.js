import { store } from "./repositories/store.js";
import { calculateBonus, calculateEvaluationScore, calculateKpiScore } from "./services/scoring.js";
const stamp = "2026-01-02T09:00:00.000Z";
const updated = "2026-09-01T09:00:00.000Z";
const baseUser = (id, name, email, title, isManager, managerId, kpiTemplateId = "tpl-engineering") => ({
    id, name, email, title, isManager, managerId, status: "active", kpiTemplateId, kpiOverrides: [], createdAt: stamp, updatedAt: updated,
});
export const seedUsers = [
    baseUser("director", "Nadia Hassan", "nadia@acme.test", "Engineering Director", true, null),
    baseUser("manager-a", "Mariam Adel", "mariam@acme.test", "Frontend Engineering Manager", true, "director"),
    baseUser("islam", "Islam Abdallah", "islam@acme.test", "Senior Frontend Developer", false, "manager-a"),
    baseUser("ahmed", "Ahmed Ali", "ahmed@acme.test", "Frontend Developer", false, "manager-a"),
    baseUser("manager-b", "Youssef Samir", "youssef@acme.test", "Platform Manager", true, "manager-a", "tpl-platform"),
    baseUser("mohamed", "Mohamed Khaled", "mohamed@acme.test", "Backend Developer", false, "manager-b", "tpl-platform"),
    baseUser("ali", "Ali Mostafa", "ali@acme.test", "Software Engineer", false, "manager-b", "tpl-platform"),
    baseUser("manager-c", "Laila Omar", "laila@acme.test", "Quality Manager", true, "director", "tpl-quality"),
    baseUser("sara", "Sara Ibrahim", "sara@acme.test", "QA Engineer", false, "manager-c", "tpl-quality"),
    baseUser("omar", "Omar Nabil", "omar@acme.test", "Automation Engineer", false, "manager-c", "tpl-quality"),
];
const systemKeys = [
    ["Q1", "Initiative", "Demonstrates initiative and proactively improves outcomes.", "score"],
    ["Q2", "Ownership", "Owns commitments through delivery and follow-up.", "score"],
    ["Q3", "Pair / Code Reviews", "Contributes useful and timely engineering reviews.", "score"],
    ["Q4", "Adherence", "Adheres to agreed processes and team standards.", "score"],
    ["Q5", "Productive Hours", "Sustains focused, productive contribution.", "number"],
    ["Q6", "Learning & Development", "Invests in relevant skills and knowledge sharing.", "score"],
    ["Q7", "Code Quality", "Produces reliable, maintainable implementation.", "score"],
    ["Q8", "Documentation", "Keeps technical and product documentation useful.", "score"],
    ["Q9", "Collaboration", "Works constructively across roles and teams.", "score"],
    ["Q10", "Sprint Delivery", "Delivers committed sprint outcomes.", "number"],
].map(([key, name, description, dataType]) => ({ id: key, key, name, description, dataType, active: true, ownerUserId: null, createdAt: stamp, updatedAt: updated }));
export const seedKeys = [
    ...systemKeys,
    { id: "key-frontend-quality", key: "FRONTEND_QUALITY", name: "Frontend Quality", description: "Measures frontend reliability, maintainability, and user-facing quality.", dataType: "score", active: true, ownerUserId: "manager-a", createdAt: stamp, updatedAt: updated },
    { id: "key-platform-uptime", key: "PLATFORM_UPTIME", name: "Platform Uptime", description: "Measures service availability against the platform target.", dataType: "percentage", active: true, ownerUserId: "manager-b", createdAt: stamp, updatedAt: updated },
    { id: "key-defect-escape", key: "DEFECT_ESCAPE", name: "Defect Escape Rate", description: "Tracks defects discovered after release.", dataType: "percentage", active: true, ownerUserId: "manager-c", createdAt: stamp, updatedAt: updated },
];
const expected = [3, 3, 4, 5, 8, 3, 10, 10, 5, 45];
const weights = [5, 5, 7, 8, 10, 10, 10, 10, 10, 25];
export const seedTemplate = {
    id: "tpl-engineering", ownerUserId: "manager-a", name: "Engineering Team Template",
    description: "Balanced delivery, quality, ownership, and collaboration KPIs.", status: "active",
    items: expected.map((expectedValue, index) => ({ key: `Q${index + 1}`, expectedValue, weight: weights[index], enabled: true })),
    createdAt: stamp, updatedAt: updated,
};
export const seedTemplates = [
    seedTemplate,
    { ...seedTemplate, id: "tpl-platform", ownerUserId: "manager-b", name: "Platform Team Template", description: "Platform delivery and engineering reliability goals." },
    { ...seedTemplate, id: "tpl-quality", ownerUserId: "manager-c", name: "Quality Team Template", description: "Quality engineering, automation, and collaboration goals." },
];
export const seedPeriods = [
    { id: "q1-2026", type: "quarterly", year: 2026, name: "Q1 2026", startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-03-31T23:59:59.000Z", status: "Closed", bonusFactor: 0.25, createdAt: stamp, updatedAt: "2026-04-03T09:00:00.000Z" },
    { id: "q2-2026", type: "quarterly", year: 2026, name: "Q2 2026", startDate: "2026-04-01T00:00:00.000Z", endDate: "2026-06-30T23:59:59.000Z", status: "Closed", bonusFactor: 0.25, createdAt: stamp, updatedAt: "2026-07-03T09:00:00.000Z" },
    { id: "q3-2026", type: "quarterly", year: 2026, name: "Q3 2026", startDate: "2026-07-01T00:00:00.000Z", endDate: "2026-09-30T23:59:59.000Z", status: "Active", bonusFactor: 0.25, createdAt: stamp, updatedAt: "2026-07-01T09:00:00.000Z" },
    { id: "sep-2026", type: "monthly", year: 2026, name: "September 2026", startDate: "2026-09-01T00:00:00.000Z", endDate: "2026-09-30T23:59:59.000Z", status: "Published", bonusFactor: 0, createdAt: stamp, updatedAt: updated },
];
function kpisFor(actuals) {
    return seedTemplate.items.map((item, index) => {
        const key = systemKeys[index];
        const actualValue = actuals[index];
        return { key: item.key, name: key.name, description: key.description, dataType: key.dataType, expectedValue: item.expectedValue, weight: item.weight, actualValue, contribution: calculateKpiScore(actualValue, item.expectedValue, item.weight) };
    });
}
function evaluation(id, userId, periodId, actuals, status) {
    const kpis = kpisFor(actuals);
    const score = calculateEvaluationScore(kpis);
    return { id, userId, periodId, templateId: seedTemplate.id, kpis, totalScore: score, bonusPercentage: calculateBonus(score, 0.25), status, createdBy: "manager-a", createdAt: stamp, updatedAt: updated };
}
const ratio = (value) => expected.map((item) => Math.round(item * value) / 100);
export const seedEvaluations = [
    evaluation("eval-islam-q1", "islam", "q1-2026", ratio(91.2), "closed"),
    evaluation("eval-islam-q2", "islam", "q2-2026", ratio(94.1), "closed"),
    evaluation("eval-islam-q3", "islam", "q3-2026", [3, 3, 4, 5, 7.6, 2.1, 10, 10, 4.55, 45], "submitted"),
    evaluation("eval-ahmed-q3", "ahmed", "q3-2026", Array(10).fill(null), "draft"),
    evaluation("eval-mohamed-q3", "mohamed", "q3-2026", ratio(87.5), "submitted"),
    evaluation("eval-sara-q3", "sara", "q3-2026", ratio(92.4), "submitted"),
];
export async function seedData(force = false) {
    if (!force && (await store.users.getAll()).length)
        return false;
    await Promise.all([
        store.users.replaceAll(seedUsers), store.keys.replaceAll(seedKeys), store.templates.replaceAll(seedTemplates),
        store.periods.replaceAll(seedPeriods), store.evaluations.replaceAll(seedEvaluations), store.audits.replaceAll([]),
    ]);
    return true;
}
