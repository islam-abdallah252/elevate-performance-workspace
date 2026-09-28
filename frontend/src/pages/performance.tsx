import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData, EvaluationKpi, PerformancePoint } from "@kpi/contracts";
import { useActor } from "../context/actor-context";
import { api } from "../lib/api";
import { Badge, Empty, ErrorState, Loading, PageHeader } from "../components/ui";

export function MyPerformancePage() {
  const { actorId } = useActor(); const query = useQuery({ queryKey: ["dashboard", actorId], queryFn: () => api<DashboardData>("/dashboard") });
  if (query.isLoading) return <Loading />; if (query.error || !query.data) return <ErrorState error={query.error} />;
  const { currentEvaluation: evaluation, currentPeriod } = query.data;
  if (!evaluation) return <><PageHeader title="My performance" description="Your active evaluation and KPI breakdown." /><Empty title="No current evaluation" text="Your manager has not created an evaluation for the current period yet." /></>;
  const chart = evaluation.kpis.map((kpi) => ({ name: kpi.key, expected: 100, actual: Math.round(((kpi.actualValue ?? 0) / kpi.expectedValue) * 10000) / 100 }));
  return <><PageHeader title="My performance" description={`${currentPeriod?.name ?? "Current period"} · ${query.data.actor.title}`} action={<Badge tone={evaluation.status === "draft" ? "amber" : "green"}>{evaluation.status}</Badge>} /><div className="mb-6 grid gap-4 sm:grid-cols-3"><Metric label="Overall score" value={`${evaluation.totalScore.toFixed(2)}%`} /><Metric label="Bonus percentage" value={`${evaluation.bonusPercentage.toFixed(2)}%`} /><Metric label="KPIs assessed" value={`${evaluation.kpis.filter((item) => item.actualValue !== null).length}/${evaluation.kpis.length}`} /></div><section className="card mb-6 p-6"><h2 className="font-semibold">Expected vs actual</h2><p className="mb-5 text-sm text-gray-500">Achievement percentage by KPI</p><ResponsiveContainer width="100%" height={320}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaecf0" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="expected" fill="#e9d7fe" radius={[4, 4, 0, 0]} /><Bar dataKey="actual" fill="#7f56d9" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></section><KpiTable points={evaluation.kpis} /> </>;
}

const Metric = ({ label, value }: { label: string; value: string }) => <div className="card p-5"><div className="text-sm text-gray-500">{label}</div><div className="mt-2 text-3xl font-semibold">{value}</div></div>;

function KpiTable({ points }: { points: EvaluationKpi[] }) {
  return <div className="card overflow-hidden"><div className="border-b border-gray-200 p-5"><h2 className="font-semibold">Detailed KPI results</h2></div><div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="table-head">KPI</th><th className="table-head">Expected</th><th className="table-head">Actual</th><th className="table-head">Weight</th><th className="table-head">Contribution</th></tr></thead><tbody>{points.map((kpi) => <tr key={kpi.key}><td className="table-cell"><strong>{kpi.key} · {kpi.name}</strong></td><td className="table-cell">{kpi.expectedValue}</td><td className="table-cell">{kpi.actualValue ?? "—"}</td><td className="table-cell">{kpi.weight}%</td><td className="table-cell font-semibold">{kpi.contribution.toFixed(2)}</td></tr>)}</tbody></table></div></div>;
}

export function PerformanceHistoryPage() {
  const { actorId } = useActor(); const query = useQuery({ queryKey: ["history", actorId, actorId], queryFn: () => api<PerformancePoint[]>(`/users/${actorId}/performance-history`) });
  if (query.isLoading) return <Loading />; if (query.error) return <ErrorState error={query.error} />;
  const data = query.data?.map((point) => ({ period: point.period.name, score: point.evaluation.totalScore, bonus: point.evaluation.bonusPercentage })) ?? [];
  return <><PageHeader title="Performance history" description="Track score and bonus trends across completed evaluation periods." />{data.length ? <><section className="card mb-6 p-6"><h2 className="font-semibold">Overall score history</h2><p className="mb-5 text-sm text-gray-500">Evaluation scores over time</p><ResponsiveContainer width="100%" height={320}><LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaecf0" /><XAxis dataKey="period" /><YAxis domain={[0, 100]} /><Tooltip /><Legend /><Line type="monotone" dataKey="score" stroke="#7f56d9" strokeWidth={3} /><Line type="monotone" dataKey="bonus" stroke="#12b76a" strokeWidth={2} /></LineChart></ResponsiveContainer></section><div className="card overflow-hidden"><table className="w-full"><thead><tr><th className="table-head">Period</th><th className="table-head">Type</th><th className="table-head">Score</th><th className="table-head">Bonus</th><th className="table-head">Status</th></tr></thead><tbody>{query.data?.map((point) => <tr key={point.evaluation.id}><td className="table-cell font-semibold">{point.period.name}</td><td className="table-cell capitalize">{point.period.type}</td><td className="table-cell font-semibold">{point.evaluation.totalScore.toFixed(2)}%</td><td className="table-cell">{point.evaluation.bonusPercentage.toFixed(2)}%</td><td className="table-cell"><Badge tone="green">{point.evaluation.status}</Badge></td></tr>)}</tbody></table></div></> : <Empty title="No performance history" text="Submitted or closed evaluations will appear here." />}</>;
}
