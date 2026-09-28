import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";

const directory = mkdtempSync(join(tmpdir(), "kpi-mvp-tests-"));
process.env.KPI_DATA_DIR = directory;
process.env.NODE_ENV = "test";
afterAll(() => rmSync(directory, { recursive: true, force: true }));
