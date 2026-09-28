import { describe, expect, it } from "vitest";
import { calculateBonus, calculateEvaluationScore, calculateKpiScore } from "./scoring.js";
describe("scoring service", () => {
    it("caps over-performance at the KPI weight", () => expect(calculateKpiScore(12, 10, 20)).toBe(20));
    it("returns a normalized evaluation percentage", () => expect(calculateEvaluationScore([
        { key: "Q1", name: "A", description: "", dataType: "score", expectedValue: 5, actualValue: 4, weight: 50, contribution: 40 },
        { key: "Q2", name: "B", description: "", dataType: "score", expectedValue: 5, actualValue: 5, weight: 50, contribution: 50 },
    ])).toBe(90));
    it("calculates the configured bonus and rejects zero expectations", () => {
        expect(calculateBonus(95.6, 0.25)).toBe(23.9);
        expect(() => calculateKpiScore(1, 0, 10)).toThrow("Expected value");
    });
});
