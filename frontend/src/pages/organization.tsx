import { useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { TeamNode } from "@kpi/contracts";
import { api } from "../lib/api";
import { useActor } from "../context/actor-context";
import { Empty, ErrorState, Loading, PageHeader } from "../components/ui";

type PersonCardProps = {
  id: string;
  name: string;
  title: string;
  isManager: boolean;
  reportCount: number;
  isRoot?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
};

const initials = (name: string) => name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

function walk(nodes: TeamNode[]): TeamNode[] {
  return nodes.flatMap((node) => [node, ...walk(node.children)]);
}

function treeDepth(nodes: TeamNode[]): number {
  if (!nodes.length) return 0;
  return 1 + Math.max(...nodes.map((node) => treeDepth(node.children)));
}

export function OrganizationPage() {
  const { actorId, actor } = useActor();
  const query = useQuery({ queryKey: ["team-tree", actorId], queryFn: () => api<TeamNode[]>(`/users/${actorId}/team`) });
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const allPeople = useMemo(() => walk(query.data ?? []), [query.data]);
  const managerIds = useMemo(() => allPeople.filter((person) => person.children.length > 0).map((person) => person.id), [allPeople]);

  if (query.isLoading) return <Loading />;
  if (query.error) return <ErrorState error={query.error} />;
  if (!actor) return <Empty title="Organization unavailable" text="Choose an identity to view its reporting hierarchy." />;

  const managerCount = allPeople.filter((person) => person.isManager).length + (actor.isManager ? 1 : 0);
  const levelCount = 1 + treeDepth(query.data ?? []);
  const allCollapsed = managerIds.length > 0 && managerIds.every((id) => collapsed.has(id));

  const toggleNode = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changeZoom = (next: number) => setZoom(Math.min(1.5, Math.max(0.45, Number(next.toFixed(2)))));

  const fitChart = () => {
    const viewport = viewportRef.current;
    const chart = chartRef.current;
    if (!viewport || !chart) return;
    const next = Math.min(1, (viewport.clientWidth - 64) / chart.offsetWidth, (viewport.clientHeight - 64) / chart.offsetHeight);
    changeZoom(next);
    requestAnimationFrame(() => {
      viewport.scrollTo({ left: Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2), top: 0, behavior: "smooth" });
    });
  };

  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a, button")) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    dragStart.current = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    const viewport = viewportRef.current;
    if (!start || !viewport) return;
    viewport.scrollLeft = start.left - (event.clientX - start.x);
    viewport.scrollTop = start.top - (event.clientY - start.y);
  };

  const stopPan = () => {
    dragStart.current = null;
    setDragging(false);
  };

  return <>
    <PageHeader title="Organization" description="See how your team is structured and who reports to whom." />

    <section className="mb-6 grid overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs sm:grid-cols-[1fr_auto]" aria-label="Organization summary">
      <div className="flex items-center gap-4 p-5 sm:p-6">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
          <HierarchyIcon />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">{actor.name}&apos;s organization</h2>
          <p className="mt-1 text-sm text-gray-500">Your reporting structure, from direct reports to every team below.</p>
        </div>
      </div>
      <dl className="grid grid-cols-3 border-t border-gray-200 bg-gray-50/70 sm:border-t-0 sm:border-l">
        <Stat value={allPeople.length + 1} label="People" />
        <Stat value={managerCount} label="Managers" />
        <Stat value={levelCount} label="Levels" />
      </dl>
    </section>

    <section className="card overflow-hidden" aria-labelledby="org-chart-title">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="org-chart-title" className="font-semibold text-gray-900">Reporting hierarchy</h2>
          <p className="mt-0.5 text-sm text-gray-500">Select a person to open their profile.</p>
        </div>
        {managerIds.length > 0 && <div className="flex items-center gap-2">
          <span className="mr-1 hidden items-center gap-2 text-xs text-gray-500 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Active</span>
          <button type="button" className="focus-ring rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50" onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(managerIds))}>
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        </div>}
      </div>

      <div className="relative">
        <div ref={viewportRef} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={stopPan} onPointerCancel={stopPan} className={`org-chart-scroll h-[620px] select-none overflow-auto bg-[radial-gradient(circle_at_center,#e4e7ec_1px,transparent_1px)] bg-[length:20px_20px] px-12 py-12 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}>
        <div ref={chartRef} style={{ zoom } as CSSProperties} className="mx-auto flex min-w-max flex-col items-center pb-12">
          <PersonCard id={actor.id} name={actor.name} title={actor.title} isManager={actor.isManager} reportCount={query.data?.length ?? 0} isRoot />
          {query.data?.length ? <>
            <div className="h-10 w-px bg-gray-300" aria-hidden="true" />
            <ul className="org-children org-children--root" aria-label={`People reporting to ${actor.name}`}>
              {query.data.map((node) => <TreeNode key={node.id} node={node} collapsed={collapsed} onToggle={toggleNode} />)}
            </ul>
          </> : <div className="mt-8 w-[min(360px,80vw)] rounded-lg border border-dashed border-gray-300 bg-white/80 p-5 text-center text-sm text-gray-500">No reporting lines below this person.</div>}
        </div></div>
        <ChartControls zoom={zoom} onZoomIn={() => changeZoom(zoom + 0.1)} onZoomOut={() => changeZoom(zoom - 0.1)} onFit={fitChart} />
      </div>
    </section>
  </>;
}

function Stat({ value, label }: { value: number; label: string }) {
  return <div className="flex min-w-24 flex-col items-center justify-center border-l border-gray-200 px-4 py-4 first:border-l-0 sm:px-6">
    <dd className="text-xl font-semibold text-gray-900">{value}</dd>
    <dt className="text-xs font-medium text-gray-500">{label}</dt>
  </div>;
}

function TreeNode({ node, collapsed, onToggle }: { node: TeamNode; collapsed: Set<string>; onToggle: (id: string) => void }) {
  const hasReports = node.children.length > 0;
  const expanded = hasReports && !collapsed.has(node.id);
  return <li className="org-node">
    <PersonCard id={node.id} name={node.name} title={node.title} isManager={node.isManager} reportCount={node.children.length} expanded={expanded} onToggle={hasReports ? () => onToggle(node.id) : undefined} />
    {expanded && <ul className="org-children" aria-label={`People reporting to ${node.name}`}>
      {node.children.map((child) => <TreeNode key={child.id} node={child} collapsed={collapsed} onToggle={onToggle} />)}
    </ul>}
  </li>;
}

function PersonCard({ id, name, title, isManager, reportCount, isRoot = false, expanded, onToggle }: PersonCardProps) {
  return <article className={`relative z-10 w-64 rounded-xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isRoot ? "border-brand-100 ring-4 ring-brand-50" : "border-gray-200"}`}>
    <div className={`h-1 rounded-t-xl ${isRoot ? "bg-brand-600" : isManager ? "bg-violet-400" : "bg-gray-200"}`} />
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold ${isRoot ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-700"}`}>
          {initials(name)}
          <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" aria-label="Active" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <Link to={`/users/${id}`} className="focus-ring block truncate rounded-sm text-sm font-semibold text-gray-900 hover:text-brand-700">{name}</Link>
          <p className="mt-0.5 truncate text-xs text-gray-500" title={title}>{title}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${isManager ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-600"}`}>{isManager ? (isRoot ? "Team lead" : "Manager") : "Individual contributor"}</span>
        {reportCount > 0 ? <button type="button" onClick={onToggle} disabled={!onToggle} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} reports for ${name}`} className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:cursor-default">
          {reportCount} {reportCount === 1 ? "report" : "reports"}
          {onToggle && <ChevronIcon expanded={Boolean(expanded)} />}
        </button> : <span className="text-xs text-gray-400">No reports</span>}
      </div>
    </div>
  </article>;
}

function ChartControls({ zoom, onZoomIn, onZoomOut, onFit }: { zoom: number; onZoomIn: () => void; onZoomOut: () => void; onFit: () => void }) {
  return <div className="absolute right-4 bottom-4 z-20 flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md" aria-label="Chart controls">
    <button type="button" onClick={onZoomOut} className="focus-ring grid h-9 w-9 place-items-center border-r border-gray-200 text-lg text-gray-600 hover:bg-gray-50" aria-label="Zoom out">−</button>
    <span className="min-w-14 px-2 text-center text-xs font-semibold text-gray-600" aria-live="polite">{Math.round(zoom * 100)}%</span>
    <button type="button" onClick={onZoomIn} className="focus-ring grid h-9 w-9 place-items-center border-l border-gray-200 text-lg text-gray-600 hover:bg-gray-50" aria-label="Zoom in">+</button>
    <button type="button" onClick={onFit} className="focus-ring grid h-9 w-10 place-items-center border-l border-gray-200 text-gray-600 hover:bg-gray-50" aria-label="Fit chart to view" title="Fit to view"><FitIcon /></button>
  </div>;
}

function HierarchyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><rect x="8" y="3" width="8" height="5" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /><rect x="14" y="16" width="7" height="5" rx="1.5" /><path d="M12 8v4m-5.5 4v-2.5h11V16" /></svg>;
}

function ChevronIcon({ expanded }: { expanded: boolean }): ReactNode {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}><path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function FitIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path d="M7 3H3v4m10-4h4v4M7 17H3v-4m10 4h4v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
