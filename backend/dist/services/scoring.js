import { invalid } from "../errors.js";
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
export function calculateKpiScore(actualValue, expectedValue, weight) {
    if (expectedValue <= 0)
        throw invalid("Expected value must be greater than zero");
    if (actualValue === null)
        return 0;
    if (!Number.isFinite(actualValue) || actualValue < 0)
        throw invalid("Actual value must be a non-negative number");
    return round(Math.min(actualValue / expectedValue, 1) * weight);
}
export function calculateEvaluationScore(kpis) {
    const weight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0);
    if (weight <= 0)
        return 0;
    return round((kpis.reduce((sum, kpi) => sum + kpi.contribution, 0) / weight) * 100);
}
export function calculateBonus(score, factor) {
    return round(score * factor);
}
