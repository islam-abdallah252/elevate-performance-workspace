export function descendantIds(users, managerId) {
    const found = new Set();
    const queue = [managerId];
    while (queue.length) {
        const parent = queue.shift();
        for (const user of users) {
            if (user.managerId === parent && !found.has(user.id)) {
                found.add(user.id);
                queue.push(user.id);
            }
        }
    }
    return found;
}
export function ancestorIds(users, userId) {
    const found = new Set();
    let current = users.find((user) => user.id === userId);
    while (current?.managerId && !found.has(current.managerId)) {
        found.add(current.managerId);
        current = users.find((user) => user.id === current.managerId);
    }
    return found;
}
export function buildTeamTree(users, rootId) {
    const build = (parentId, visited) => users
        .filter((user) => user.managerId === parentId && !visited.has(user.id))
        .map((user) => ({ ...user, children: build(user.id, new Set([...visited, user.id])) }));
    return build(rootId, new Set([rootId]));
}
