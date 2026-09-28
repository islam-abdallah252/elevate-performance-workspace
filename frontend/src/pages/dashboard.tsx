import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardData } from "@kpi/contracts";
import { useActor } from "../context/actor-context";
import { api } from "../lib/api";
import { Badge, Empty, ErrorState, Loading, PageHeader } from "../components/ui";

const scoreTone = (score: number) => score >= 90 ? "green" : score >= 75 ? "blue" : "amber";

export function DashboardPage() {
  const { actorId } = useActor();
  const query = useQuery({ queryKey: ["dashboard", actorId], queryFn: () => api<DashboardData>("/dashboard") });
  if (query.isLoading) return <Loading />;
  if (query.error || !query.data) return <ErrorState error={query.error} />;
  const data = query.data;
  return <><PageHeader title={`Welcome back, ${data.actor.name.split(" ")[0]}`} description={data.actor.isManager ? "A live view of team performance and evaluation progress." : "Your current score, KPI progress, and recent performance."} />
    {data.actor.isManager && data.metrics ? <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[['Direct reports', data.metrics.directReports], ['Managers below', data.metrics.managersBelow], ['Completed', data.metrics.completed], ['Pending', data.metrics.pending], ['Team average', `${data.metrics.teamAverage.toFixed(2)}%`]].map(([label, value]) => <div className="card p-5" key={label}><div className="text-sm font-medium text-gray-500">{label}</div><div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div></div>)}
      </div>
      <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><div><h2 className="font-semibold">My team</h2><p className="text-sm text-gray-500">{data.currentPeriod?.name ?? "No current period"}</p></div><Link className="text-sm font-semibold text-brand-700" to="/team-evaluations">View evaluations →</Link></div>
        {data.team?.length ? <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="table-head">Employee</th><th className="table-head">Role</th><th className="table-head">Score</th><th className="table-head">Status</th></tr></thead><tbody>{data.team.slice(0, 8).map(({ user, evaluation }) => <tr key={user.id}><td className="table-cell"><Link className="font-semibold text-gray-900 hover:text-brand-700" to={`/users/${user.id}`}>{user.name}</Link></td><td className="table-cell">{user.title}</td><td className="table-cell font-semibold">{evaluation ? `${evaluation.totalScore.toFixed(2)}%` : "—"}</td><td className="table-cell"><Badge tone={evaluation?.status === "submitted" || evaluation?.status === "closed" ? "green" : "amber"}>{evaluation?.status ?? "Pending"}</Badge></td></tr>)}</tbody></table></div> : <div className="p-5"><Empty title="No team members" text="Add reports to start tracking team performance." /></div>}
      </section>
    </> : <EmployeeOverview data={data} />}
  </>;
}

function EmployeeOverview({ data }: { data: DashboardData }) {
  const chart = data.history.map((point) => ({ name: point.period.name, score: point.evaluation.totalScore }));
  return <div className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
    <section className="card p-6"><div className="text-sm font-medium text-gray-500">Current evaluation</div><div className="mt-4 flex items-end gap-2"><span className="text-5xl font-semibold tracking-tight">{data.currentEvaluation?.totalScore.toFixed(2) ?? "—"}</span>{data.currentEvaluation && <span className="mb-1 text-lg text-gray-500">/ 100</span>}</div><div className="mt-4 flex gap-2"><Badge tone={data.currentEvaluation ? scoreTone(data.currentEvaluation.totalScore) : "gray"}>{data.currentEvaluation?.status ?? "Not started"}</Badge>{data.currentPeriod && <Badge tone="purple">{data.currentPeriod.name}</Badge>}</div><div className="mt-8 border-t border-gray-200 pt-5"><div className="text-sm text-gray-500">Bonus percentage</div><div className="mt-1 text-2xl font-semibold">{data.currentEvaluation?.bonusPercentage.toFixed(2) ?? "0.00"}%</div></div></section>
    <section className="card p-6"><h2 className="font-semibold">Score history</h2><p className="mb-5 text-sm text-gray-500">Completed evaluation trend</p>{chart.length ? <ResponsiveContainer width="100%" height={260}><LineChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaecf0" /><XAxis dataKey="name" tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} /><Tooltip /><Line type="monotone" dataKey="score" stroke="#7f56d9" strokeWidth={3} dot={{ fill: "#7f56d9", r: 4 }} /></LineChart></ResponsiveContainer> : <Empty title="No history yet" text="Submitted evaluations will appear here." />}</section>
  </div>;
}
