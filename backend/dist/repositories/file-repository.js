import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
export class FileRepository {
    filePath;
    queue = Promise.resolve();
    constructor(filePath) {
        this.filePath = filePath;
    }
    async ensure() {
        await mkdir(dirname(this.filePath), { recursive: true });
        try {
            await readFile(this.filePath, "utf8");
        }
        catch {
            await writeFile(this.filePath, "[]\n", "utf8");
        }
    }
    async getAll() {
        await this.ensure();
        const contents = await readFile(this.filePath, "utf8");
        const parsed = JSON.parse(contents || "[]");
        if (!Array.isArray(parsed))
            throw new Error(`Invalid JSON repository: ${this.filePath}`);
        return parsed;
    }
    async getById(id) {
        return (await this.getAll()).find((item) => item.id === id);
    }
    async create(item) {
        return this.mutate((items) => {
            if (items.some((entry) => entry.id === item.id))
                throw new Error(`Duplicate id ${item.id}`);
            items.push(item);
            return item;
        });
    }
    async update(id, updater) {
        return this.mutate((items) => {
            const index = items.findIndex((item) => item.id === id);
            if (index < 0)
                return undefined;
            items[index] = updater(items[index]);
            return items[index];
        });
    }
    async delete(id) {
        return this.mutate((items) => {
            const index = items.findIndex((item) => item.id === id);
            if (index < 0)
                return undefined;
            const [deleted] = items.splice(index, 1);
            return deleted;
        });
    }
    async replaceAll(items) {
        await this.withLock(async () => this.write(items));
    }
    async mutate(change) {
        let result;
        await this.withLock(async () => {
            const items = await this.getAll();
            result = change(items);
            await this.write(items);
        });
        return result;
    }
    async write(items) {
        await this.ensure();
        const temp = `${this.filePath}.${process.pid}.tmp`;
        await writeFile(temp, `${JSON.stringify(items, null, 2)}\n`, "utf8");
        await rename(temp, this.filePath);
    }
    async withLock(work) {
        const next = this.queue.then(work, work);
        this.queue = next.catch(() => undefined);
        await next;
    }
}
