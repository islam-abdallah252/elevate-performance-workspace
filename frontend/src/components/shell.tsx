import { NavLink, Outlet } from "react-router-dom";
import { useActor } from "../context/actor-context";

const links = [
  ["/", "Overview", false], ["/users", "People", false], ["/organization", "Organization", false], ["/kpi-keys", "KPI library", true],
  ["/templates", "Templates", true], ["/periods", "Periods", false], ["/team-evaluations", "Team evaluations", false],
  ["/my-performance", "My performance", false], ["/performance-history", "History", false],
] as const;

export function AppShell() {
  const { actorId, actor, actors, switchActor } = useActor();
  return <div className="min-h-screen bg-gray-50 lg:grid lg:grid-cols-[260px_1fr]">
    <aside className="border-b border-gray-200 bg-white lg:fixed lg:inset-y-0 lg:w-[260px] lg:border-r lg:border-b-0">
      <div className="flex h-18 items-center gap-3 px-5"><div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 font-bold text-white">E</div><div><div className="font-semibold">Elevate</div><div className="text-xs text-gray-500">Performance workspace</div></div></div>
      <nav className="flex gap-1 overflow-auto px-3 pb-3 lg:block lg:space-y-1">
        {links.filter(([, , managerOnly]) => !managerOnly || actor?.isManager).map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `block whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium ${isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>{label}</NavLink>)}
      </nav>
      <div className="hidden border-t border-gray-200 p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block"><div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Demo identity</div><select aria-label="Demo identity" className="field" value={actorId} onChange={(event) => switchActor(event.target.value)}>{actors.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isManager ? " · Manager" : ""}</option>)}</select>{actor && <p className="mt-2 truncate text-xs text-gray-500">{actor.title}</p>}</div>
    </aside>
    <main className="min-w-0 lg:col-start-2"><header className="flex h-18 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-8"><div className="text-sm text-gray-500">Performance & KPI Management</div><select aria-label="Demo identity mobile" className="field max-w-52 lg:hidden" value={actorId} onChange={(event) => switchActor(event.target.value)}>{actors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="hidden text-right lg:block"><div className="text-sm font-semibold">{actor?.name ?? "Loading…"}</div><div className="text-xs text-gray-500">{actor?.isManager ? "Manager view" : "Employee view"}</div></div></header><div className="mx-auto max-w-[1440px] p-4 sm:p-8"><Outlet /></div></main>
  </div>;
}
