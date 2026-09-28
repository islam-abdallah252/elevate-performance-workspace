import { useQuery } from "@tanstack/react-query";
import type { TeamNode } from "@kpi/contracts";
import { api } from "../lib/api";
import { useActor } from "../context/actor-context";
import { Badge, ErrorState, Loading, PageHeader } from "../components/ui";

export function OrganizationPage() {
  const { actorId, actor } = useActor();
  const query = useQuery({ queryKey: ["team-tree", actorId], queryFn: () => api<TeamNode[]>(`/users/${actorId}/team`) });
  if (query.isLoading) return <Loading />; if (query.error) return <ErrorState error={query.error} />;
  return <><PageHeader title="Organization" description="Explore the reporting hierarchy at any depth." /><div className="card p-6"><div className="mb-4 rounded-lg border border-brand-100 bg-brand-50 p-4"><div className="font-semibold text-brand-700">{actor?.name}</div><div className="text-sm text-brand-700/70">{actor?.title}</div></div><div className="space-y-3">{query.data?.map((node) => <TreeNode key={node.id} node={node} depth={0} />)}</div></div></>;
}

function TreeNode({ node, depth }: { node: TeamNode; depth: number }) {
  return <div style={{ marginLeft: Math.min(depth, 6) * 24 }}><details open={depth < 2} className="group"><summary className="focus-ring flex list-none items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50"><span className="text-gray-400 transition group-open:rotate-90">›</span><div className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-sm font-semibold">{node.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{node.name}</div><div className="truncate text-xs text-gray-500">{node.title}</div></div>{node.isManager && <Badge tone="purple">Manager · {node.children.length}</Badge>}</summary>{node.children.length > 0 && <div className="mt-3 space-y-3 border-l border-gray-200 pl-3">{node.children.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} />)}</div>}</details></div>;
}
