import type { EvaluationKpi } from "@kpi/contracts";
import { invalid } from "../errors.js";

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateKpiScore(actualValue: number | null, expectedValue: number, weight: number): number {
  if (expectedValue <= 0) throw invalid("Expected value must be greater than zero");
  if (actualValue === null) return 0;
  if (!Number.isFinite(actualValue) || actualValue < 0) throw invalid("Actual value must be a non-negative number");
  return round(Math.min(actualValue / expectedValue, 1) * weight);
}

export function calculateEvaluationScore(kpis: EvaluationKpi[]): number {
  const weight = kpis.reduce((sum, kpi) => sum + kpi.weight, 0);
  if (weight <= 0) return 0;
  return round((kpis.reduce((sum, kpi) => sum + kpi.contribution, 0) / weight) * 100);
}

export function calculateBonus(score: number, factor: number): number {
  return round(score * factor);
}
