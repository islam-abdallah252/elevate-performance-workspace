import type { TeamNode, User } from "@kpi/contracts";

export function descendantIds(users: User[], managerId: string): Set<string> {
  const found = new Set<string>();
  const queue = [managerId];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const user of users) {
      if (user.managerId === parent && !found.has(user.id)) {
        found.add(user.id);
        queue.push(user.id);
      }
    }
  }
  return found;
}

export function ancestorIds(users: User[], userId: string): Set<string> {
  const found = new Set<string>();
  let current = users.find((user) => user.id === userId);
  while (current?.managerId && !found.has(current.managerId)) {
    found.add(current.managerId);
    current = users.find((user) => user.id === current!.managerId);
  }
  return found;
}

export function buildTeamTree(users: User[], rootId: string): TeamNode[] {
  const build = (parentId: string, visited: Set<string>): TeamNode[] => users
    .filter((user) => user.managerId === parentId && !visited.has(user.id))
    .map((user) => ({ ...user, children: build(user.id, new Set([...visited, user.id])) }));
  return build(rootId, new Set([rootId]));
}
