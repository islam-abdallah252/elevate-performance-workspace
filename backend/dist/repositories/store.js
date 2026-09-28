import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FileRepository } from "./file-repository.js";
const here = dirname(fileURLToPath(import.meta.url));
export const dataDirectory = process.env.KPI_DATA_DIR ?? join(here, "../../data");
export const store = {
    users: new FileRepository(join(dataDirectory, "users.json")),
    keys: new FileRepository(join(dataDirectory, "kpi-keys.json")),
    templates: new FileRepository(join(dataDirectory, "kpi-templates.json")),
    periods: new FileRepository(join(dataDirectory, "periods.json")),
    evaluations: new FileRepository(join(dataDirectory, "evaluations.json")),
    audits: new FileRepository(join(dataDirectory, "audit-logs.json")),
};
