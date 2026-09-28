import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface Entity { id: string }

export class FileRepository<T extends Entity> {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private async ensure(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    try { await readFile(this.filePath, "utf8"); }
    catch { await writeFile(this.filePath, "[]\n", "utf8"); }
  }

  async getAll(): Promise<T[]> {
    await this.ensure();
    const contents = await readFile(this.filePath, "utf8");
    const parsed: unknown = JSON.parse(contents || "[]");
    if (!Array.isArray(parsed)) throw new Error(`Invalid JSON repository: ${this.filePath}`);
    return parsed as T[];
  }

  async getById(id: string): Promise<T | undefined> {
    return (await this.getAll()).find((item) => item.id === id);
  }

  async create(item: T): Promise<T> {
    return this.mutate((items) => {
      if (items.some((entry) => entry.id === item.id)) throw new Error(`Duplicate id ${item.id}`);
      items.push(item);
      return item;
    });
  }

  async update(id: string, updater: (current: T) => T): Promise<T | undefined> {
    return this.mutate((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return undefined;
      items[index] = updater(items[index]);
      return items[index];
    });
  }

  async delete(id: string): Promise<T | undefined> {
    return this.mutate((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return undefined;
      const [deleted] = items.splice(index, 1);
      return deleted;
    });
  }

  async replaceAll(items: T[]): Promise<void> {
    await this.withLock(async () => this.write(items));
  }

  private async mutate<R>(change: (items: T[]) => R): Promise<R> {
    let result!: R;
    await this.withLock(async () => {
      const items = await this.getAll();
      result = change(items);
      await this.write(items);
    });
    return result;
  }

  private async write(items: T[]): Promise<void> {
    await this.ensure();
    const temp = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify(items, null, 2)}\n`, "utf8");
    await rename(temp, this.filePath);
  }

  private async withLock(work: () => Promise<void>): Promise<void> {
    const next = this.queue.then(work, work);
    this.queue = next.catch(() => undefined);
    await next;
  }
}
