import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/shell";
import { DashboardPage } from "./pages/dashboard";
import { UsersPage, UserDetailsPage } from "./pages/users";
import { OrganizationPage } from "./pages/organization";
import { KpiKeysPage, TemplatesPage } from "./pages/kpis";
import { PeriodsPage } from "./pages/periods";
import { TeamEvaluationsPage, EvaluationPage } from "./pages/evaluations";
import { MyPerformancePage, PerformanceHistoryPage } from "./pages/performance";

export function App() {
  return <Routes><Route element={<AppShell />}>
    <Route index element={<DashboardPage />} />
    <Route path="users" element={<UsersPage />} />
    <Route path="users/:id" element={<UserDetailsPage />} />
    <Route path="organization" element={<OrganizationPage />} />
    <Route path="kpi-keys" element={<KpiKeysPage />} />
    <Route path="templates" element={<TemplatesPage />} />
    <Route path="periods" element={<PeriodsPage />} />
    <Route path="team-evaluations" element={<TeamEvaluationsPage />} />
    <Route path="evaluations/:id" element={<EvaluationPage />} />
    <Route path="my-performance" element={<MyPerformancePage />} />
    <Route path="performance-history" element={<PerformanceHistoryPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes>;
}
