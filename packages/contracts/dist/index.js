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
