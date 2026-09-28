import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { AuditLog, Evaluation, KpiKey, KpiTemplate, Period, User } from "@kpi/contracts";
import { FileRepository } from "./file-repository.js";

const here = dirname(fileURLToPath(import.meta.url));
export const dataDirectory = process.env.KPI_DATA_DIR ?? join(here, "../../data");

export const store = {
  users: new FileRepository<User>(join(dataDirectory, "users.json")),
  keys: new FileRepository<KpiKey>(join(dataDirectory, "kpi-keys.json")),
  templates: new FileRepository<KpiTemplate>(join(dataDirectory, "kpi-templates.json")),
  periods: new FileRepository<Period>(join(dataDirectory, "periods.json")),
  evaluations: new FileRepository<Evaluation>(join(dataDirectory, "evaluations.json")),
  audits: new FileRepository<AuditLog>(join(dataDirectory, "audit-logs.json")),
};
