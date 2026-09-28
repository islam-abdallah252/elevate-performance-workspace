import { z } from "zod";
export declare const userStatusSchema: z.ZodEnum<["active", "inactive"]>;
export declare const dataTypeSchema: z.ZodEnum<["score", "percentage", "number"]>;
export declare const templateStatusSchema: z.ZodEnum<["draft", "active", "archived"]>;
export declare const periodTypeSchema: z.ZodEnum<["monthly", "quarterly"]>;
export declare const periodStatusSchema: z.ZodEnum<["Draft", "Published", "Active", "Closed", "Archived"]>;
export declare const evaluationStatusSchema: z.ZodEnum<["draft", "submitted", "closed"]>;
export declare const kpiCodeSchema: z.ZodString;
export declare const kpiKeyInputSchema: z.ZodObject<{
    key: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    dataType: z.ZodEnum<["score", "percentage", "number"]>;
    active: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    active: boolean;
    key: string;
    name: string;
    description: string;
    dataType: "number" | "score" | "percentage";
}, {
    key: string;
    name: string;
    description: string;
    dataType: "number" | "score" | "percentage";
    active?: boolean | undefined;
}>;
export declare const kpiOverrideSchema: z.ZodObject<{
    key: z.ZodString;
    expectedValue: z.ZodOptional<z.ZodNumber>;
    weight: z.ZodOptional<z.ZodNumber>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    key: string;
    expectedValue?: number | undefined;
    weight?: number | undefined;
    enabled?: boolean | undefined;
}, {
    key: string;
    expectedValue?: number | undefined;
    weight?: number | undefined;
    enabled?: boolean | undefined;
}>;
export declare const userInputSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    title: z.ZodString;
    isManager: z.ZodBoolean;
    managerId: z.ZodNullable<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive"]>>;
    kpiTemplateId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    kpiOverrides: z.ZodDefault<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        expectedValue: z.ZodOptional<z.ZodNumber>;
        weight: z.ZodOptional<z.ZodNumber>;
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        key: string;
        expectedValue?: number | undefined;
        weight?: number | undefined;
        enabled?: boolean | undefined;
    }, {
        key: string;
        expectedValue?: number | undefined;
        weight?: number | undefined;
        enabled?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    status: "active" | "inactive";
    email: string;
    title: string;
    isManager: boolean;
    managerId: string | null;
    kpiOverrides: {
        key: string;
        expectedValue?: number | undefined;
        weight?: number | undefined;
        enabled?: boolean | undefined;
    }[];
    kpiTemplateId?: string | null | undefined;
}, {
    name: string;
    email: string;
    title: string;
    isManager: boolean;
    managerId: string | null;
    status?: "active" | "inactive" | undefined;
    kpiTemplateId?: string | null | undefined;
    kpiOverrides?: {
        key: string;
        expectedValue?: number | undefined;
        weight?: number | undefined;
        enabled?: boolean | undefined;
    }[] | undefined;
}>;
export declare const templateItemSchema: z.ZodObject<{
    key: z.ZodString;
    weight: z.ZodNumber;
    expectedValue: z.ZodNumber;
    enabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    key: string;
    expectedValue: number;
    weight: number;
    enabled: boolean;
}, {
    key: string;
    expectedValue: number;
    weight: number;
    enabled: boolean;
}>;
export declare const templateInputSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "archived"]>>;
    items: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        weight: z.ZodNumber;
        expectedValue: z.ZodNumber;
        enabled: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        key: string;
        expectedValue: number;
        weight: number;
        enabled: boolean;
    }, {
        key: string;
        expectedValue: number;
        weight: number;
        enabled: boolean;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    status: "active" | "draft" | "archived";
    items: {
        key: string;
        expectedValue: number;
        weight: number;
        enabled: boolean;
    }[];
}, {
    name: string;
    items: {
        key: string;
        expectedValue: number;
        weight: number;
        enabled: boolean;
    }[];
    description?: string | undefined;
    status?: "active" | "draft" | "archived" | undefined;
}>;
export declare const periodInputSchema: z.ZodObject<{
    type: z.ZodEnum<["monthly", "quarterly"]>;
    year: z.ZodNumber;
    name: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["Draft", "Published", "Active", "Closed", "Archived"]>>;
    bonusFactor: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: "monthly" | "quarterly";
    status: "Draft" | "Published" | "Active" | "Closed" | "Archived";
    year: number;
    startDate: string;
    endDate: string;
    bonusFactor?: number | undefined;
}, {
    name: string;
    type: "monthly" | "quarterly";
    year: number;
    startDate: string;
    endDate: string;
    status?: "Draft" | "Published" | "Active" | "Closed" | "Archived" | undefined;
    bonusFactor?: number | undefined;
}>;
export declare const evaluationCreateSchema: z.ZodObject<{
    userId: z.ZodString;
    periodId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
    periodId: string;
}, {
    userId: string;
    periodId: string;
}>;
export declare const evaluationUpdateSchema: z.ZodObject<{
    actualValues: z.ZodRecord<z.ZodString, z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    actualValues: Record<string, number | null>;
}, {
    actualValues: Record<string, number | null>;
}>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type DataType = z.infer<typeof dataTypeSchema>;
export type TemplateStatus = z.infer<typeof templateStatusSchema>;
export type PeriodType = z.infer<typeof periodTypeSchema>;
export type PeriodStatus = z.infer<typeof periodStatusSchema>;
export type EvaluationStatus = z.infer<typeof evaluationStatusSchema>;
export type KpiKeyInput = z.infer<typeof kpiKeyInputSchema>;
export type KpiOverride = z.infer<typeof kpiOverrideSchema>;
export type UserInput = z.infer<typeof userInputSchema>;
export type TemplateItem = z.infer<typeof templateItemSchema>;
export type TemplateInput = z.infer<typeof templateInputSchema>;
export type PeriodInput = z.infer<typeof periodInputSchema>;
export interface User extends UserInput {
    id: string;
    createdAt: string;
    updatedAt: string;
}
export interface KpiKey {
    id: string;
    key: string;
    name: string;
    description: string;
    dataType: DataType;
    active: boolean;
    ownerUserId: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface KpiTemplate extends TemplateInput {
    id: string;
    ownerUserId: string;
    createdAt: string;
    updatedAt: string;
}
export interface Period extends PeriodInput {
    id: string;
    bonusFactor: number;
    createdAt: string;
    updatedAt: string;
}
export interface EvaluationKpi {
    key: string;
    name: string;
    description: string;
    dataType: DataType;
    expectedValue: number;
    weight: number;
    actualValue: number | null;
    contribution: number;
}
export interface Evaluation {
    id: string;
    userId: string;
    periodId: string;
    templateId: string;
    kpis: EvaluationKpi[];
    totalScore: number;
    bonusPercentage: number;
    status: EvaluationStatus;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}
export interface AuditLog {
    id: string;
    action: string;
    actorUserId: string;
    targetUserId?: string;
    timestamp: string;
    details: Record<string, unknown>;
}
export interface TeamNode extends User {
    children: TeamNode[];
}
export interface PerformancePoint {
    period: Period;
    evaluation: Evaluation;
}
export interface DashboardData {
    actor: User;
    currentPeriod: Period | null;
    currentEvaluation: Evaluation | null;
    history: PerformancePoint[];
    metrics?: {
        directReports: number;
        managersBelow: number;
        completed: number;
        pending: number;
        teamAverage: number;
    };
    team?: Array<{
        user: User;
        evaluation: Evaluation | null;
    }>;
}
export interface ApiSuccess<T> {
    data: T;
    meta?: Record<string, unknown>;
}
export interface ApiFailure {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
