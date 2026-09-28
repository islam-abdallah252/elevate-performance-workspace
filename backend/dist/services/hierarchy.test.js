import { describe, expect, it } from "vitest";
import { buildTeamTree, descendantIds } from "./hierarchy.js";
const user = (id, managerId, isManager = false) => ({ id, managerId, isManager, name: id, email: `${id}@test.local`, title: "Test", status: "active", kpiTemplateId: null, kpiOverrides: [], createdAt: "x", updatedAt: "x" });
const users = [user("root", null, true), user("m1", "root", true), user("m2", "m1", true), user("person", "m2")];
describe("hierarchy service", () => {
    it("finds descendants at unlimited depth", () => expect([...descendantIds(users, "root")]).toEqual(["m1", "m2", "person"]));
    it("builds a recursive tree", () => expect(buildTeamTree(users, "root")[0].children[0].children[0].id).toBe("person"));
});
