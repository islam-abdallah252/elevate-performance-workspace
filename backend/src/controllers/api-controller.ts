import type { Request, Response } from "express";
import { z } from "zod";
import {
  evaluationCreateSchema, evaluationUpdateSchema, kpiKeyInputSchema, periodInputSchema,
  templateInputSchema, userInputSchema,
} from "@kpi/contracts";
import { invalid } from "../errors.js";
import { appService } from "../services/app-service.js";

const assignmentSchema = z.object({ templateId: z.string(), overrides: z.array(z.object({
  key: z.string(), expectedValue: z.number().positive().optional(), weight: z.number().nonnegative().optional(), enabled: z.boolean().optional(),
})).default([]) });
const keyUpdateSchema = kpiKeyInputSchema.omit({ key: true });

const actorId = (req: Request) => {
  const value = req.header("X-Actor-User-Id");
  if (!value) throw invalid("X-Actor-User-Id header is required");
  return value;
};
const param = (req: Request, name: string) => {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
};
const send = (res: Response, data: unknown, status = 200) => res.status(status).json({ data });

export const apiController = {
  demoActors: async (_req: Request, res: Response) => send(res, await appService.demoActors()),
  session: async (req: Request, res: Response) => send(res, await appService.session(actorId(req))),
  users: async (req: Request, res: Response) => send(res, await appService.users(actorId(req))),
  user: async (req: Request, res: Response) => send(res, await appService.user(actorId(req), param(req, "id"))),
  createUser: async (req: Request, res: Response) => send(res, await appService.createUser(actorId(req), userInputSchema.parse(req.body)), 201),
  updateUser: async (req: Request, res: Response) => send(res, await appService.updateUser(actorId(req), param(req, "id"), userInputSchema.parse(req.body))),
  assignTemplate: async (req: Request, res: Response) => { const body = assignmentSchema.parse(req.body); return send(res, await appService.assignTemplate(actorId(req), param(req, "id"), body.templateId, body.overrides)); },
  children: async (req: Request, res: Response) => send(res, await appService.children(actorId(req), param(req, "id"))),
  team: async (req: Request, res: Response) => send(res, await appService.team(actorId(req), param(req, "id"))),
  history: async (req: Request, res: Response) => send(res, await appService.history(actorId(req), param(req, "id"))),
  keys: async (req: Request, res: Response) => send(res, await appService.keys(actorId(req))),
  key: async (req: Request, res: Response) => send(res, await appService.key(actorId(req), param(req, "key"))),
  createKey: async (req: Request, res: Response) => send(res, await appService.createKey(actorId(req), kpiKeyInputSchema.parse(req.body)), 201),
  updateKey: async (req: Request, res: Response) => send(res, await appService.updateKey(actorId(req), param(req, "key"), keyUpdateSchema.parse(req.body))),
  deleteKey: async (req: Request, res: Response) => send(res, await appService.deleteKey(actorId(req), param(req, "key"))),
  templates: async (req: Request, res: Response) => send(res, await appService.templates(actorId(req))),
  template: async (req: Request, res: Response) => send(res, await appService.template(actorId(req), param(req, "id"))),
  createTemplate: async (req: Request, res: Response) => send(res, await appService.createTemplate(actorId(req), templateInputSchema.parse(req.body)), 201),
  updateTemplate: async (req: Request, res: Response) => send(res, await appService.updateTemplate(actorId(req), param(req, "id"), templateInputSchema.parse(req.body))),
  deleteTemplate: async (req: Request, res: Response) => send(res, await appService.deleteTemplate(actorId(req), param(req, "id"))),
  periods: async (req: Request, res: Response) => send(res, await appService.periods(actorId(req))),
  createPeriod: async (req: Request, res: Response) => send(res, await appService.createPeriod(actorId(req), periodInputSchema.parse(req.body)), 201),
  updatePeriod: async (req: Request, res: Response) => send(res, await appService.updatePeriod(actorId(req), param(req, "id"), periodInputSchema.parse(req.body))),
  evaluations: async (req: Request, res: Response) => send(res, await appService.evaluations(actorId(req), typeof req.query.userId === "string" ? req.query.userId : undefined)),
  userEvaluations: async (req: Request, res: Response) => send(res, await appService.evaluations(actorId(req), param(req, "id"))),
  evaluation: async (req: Request, res: Response) => send(res, await appService.evaluation(actorId(req), param(req, "id"))),
  createEvaluation: async (req: Request, res: Response) => { const body = evaluationCreateSchema.parse(req.body); return send(res, await appService.createEvaluation(actorId(req), body.userId, body.periodId), 201); },
  updateEvaluation: async (req: Request, res: Response) => { const body = evaluationUpdateSchema.parse(req.body); return send(res, await appService.updateEvaluation(actorId(req), param(req, "id"), body.actualValues)); },
  submitEvaluation: async (req: Request, res: Response) => send(res, await appService.transitionEvaluation(actorId(req), param(req, "id"), "submit")),
  closeEvaluation: async (req: Request, res: Response) => send(res, await appService.transitionEvaluation(actorId(req), param(req, "id"), "close")),
  dashboard: async (req: Request, res: Response) => send(res, await appService.dashboard(actorId(req))),
  audits: async (req: Request, res: Response) => send(res, await appService.audits(actorId(req))),
};
