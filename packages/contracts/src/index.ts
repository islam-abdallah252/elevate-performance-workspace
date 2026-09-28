import { z } from "zod";

export const userStatusSchema = z.enum(["active", "inactive"]);
export const dataTypeSchema = z.enum(["score", "percentage", "number"]);
export const templateStatusSchema = z.enum(["draft", "active", "archived"]);
export const periodTypeSchema = z.enum(["monthly", "quarterly"]);
export const periodStatusSchema = z.enum(["Draft", "Published", "Active", "Closed", "Archived"]);
export const evaluationStatusSchema = z.enum(["draft", "submitted", "closed"]);
export const kpiCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_-]{1,19}$/, "Use 2-20 uppercase letters, numbers, underscores, or hyphens");
export const kpiKeyInputSchema = z.object({
  key: kpiCodeSchema,
  name: z.string().min(2),
  description: z.string().min(2),
  dataType: dataTypeSchema,
  active: z.boolean().default(true),
});

export const kpiOverrideSchema = z.object({
  key: kpiCodeSchema,
  expectedValue: z.number().positive().optional(),
  weight: z.number().nonnegative().optional(),
  enabled: z.boolean().optional(),
});

export const userInputSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  title: z.string().min(2),
  isManager: z.boolean(),
  managerId: z.string().nullable(),
  status: userStatusSchema.default("active"),
  kpiTemplateId: z.string().nullable().optional(),
  kpiOverrides: z.array(kpiOverrideSchema).default([]),
});

export const templateItemSchema = z.object({
  key: kpiCodeSchema,
  weight: z.number().min(0).max(100),
  expectedValue: z.number().positive(),
  enabled: z.boolean(),
});

export const templateInputSchema = z.object({
  name: z.string().min(2),
  description: z.string().default(""),
  status: templateStatusSchema.default("draft"),
  items: z.array(templateItemSchema).min(1),
});

export const periodInputSchema = z.object({
  type: periodTypeSchema,
  year: z.number().int().min(2020).max(2100),
  name: z.string().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: periodStatusSchema.default("Draft"),
  bonusFactor: z.number().min(0).max(1).optional(),
});

export const evaluationCreateSchema = z.object({ userId: z.string(), periodId: z.string() });
export const evaluationUpdateSchema = z.object({
  actualValues: z.record(z.string(), z.number().nonnegative().nullable()),
});

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

export interface TeamNode extends User { children: TeamNode[] }
export interface PerformancePoint { period: Period; evaluation: Evaluation }
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
  team?: Array<{ user: User; evaluation: Evaluation | null }>;
}

export interface ApiSuccess<T> { data: T; meta?: Record<string, unknown> }
export interface ApiFailure { error: { code: string; message: string; details?: unknown } }
