import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { TeamNode, User } from "@kpi/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrganizationPage } from "./organization";

const stamp = "2026-01-01T00:00:00.000Z";
const actor: User = {
  id: "director",
  name: "Nadia Hassan",
  email: "nadia@example.test",
  title: "Engineering Director",
  isManager: true,
  managerId: null,
  status: "active",
  kpiTemplateId: null,
  kpiOverrides: [],
  createdAt: stamp,
  updatedAt: stamp,
};

const team: TeamNode[] = [{
  ...actor,
  id: "manager",
  name: "Mariam Adel",
  email: "mariam@example.test",
  title: "Engineering Manager",
  managerId: actor.id,
  children: [{
    ...actor,
    id: "engineer",
    name: "Islam Abdallah",
    email: "islam@example.test",
    title: "Senior Frontend Developer",
    isManager: false,
    managerId: "manager",
    children: [],
  }],
}];

vi.mock("../context/actor-context", () => ({
  useActor: () => ({ actorId: actor.id, actor }),
}));

vi.mock("../lib/api", () => ({
  api: vi.fn(async () => team),
}));

afterEach(cleanup);

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><OrganizationPage /></MemoryRouter></QueryClientProvider>);
}

describe("OrganizationPage", () => {
  it("renders organization metrics and the complete reporting hierarchy", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Reporting hierarchy" })).toBeInTheDocument();
    expect(screen.getByText("Nadia Hassan")).toBeInTheDocument();
    expect(screen.getByText("Mariam Adel")).toBeInTheDocument();
    expect(screen.getByText("Islam Abdallah")).toBeInTheDocument();
    const summary = within(screen.getByLabelText("Organization summary"));
    expect(summary.getAllByText("3")).toHaveLength(2);
    expect(summary.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fit chart to view" })).toBeInTheDocument();
  });

  it("collapses and expands manager branches", async () => {
    renderPage();
    const collapse = await screen.findByRole("button", { name: "Collapse reports for Mariam Adel" });

    fireEvent.click(collapse);
    expect(screen.queryByText("Islam Abdallah")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand reports for Mariam Adel" }));

    await waitFor(() => expect(screen.getByText("Islam Abdallah")).toBeInTheDocument());
  });

  it("updates the displayed zoom level", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Reporting hierarchy" });

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("110%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
