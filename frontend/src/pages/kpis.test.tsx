import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { KpiKey, TemplateInput } from "@kpi/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TemplateForm } from "./kpis";

afterEach(cleanup);

const stamp = "2026-01-01T00:00:00.000Z";
const keys: KpiKey[] = [
  { id: "q1", key: "Q1", name: "Initiative", description: "Takes initiative", dataType: "score", active: true, ownerUserId: null, createdAt: stamp, updatedAt: stamp },
  { id: "quality", key: "FRONTEND_QUALITY", name: "Frontend Quality", description: "Builds reliable interfaces", dataType: "score", active: true, ownerUserId: "manager-a", createdAt: stamp, updatedAt: stamp },
];

const draft: TemplateInput = { name: "New template", description: "", status: "draft", items: [] };

describe("KPI template selector", () => {
  it("adds a selected KPI to a new template and submits only selected rows", () => {
    const onSave = vi.fn();
    render(<TemplateForm initial={draft} keys={keys} busy={false} error={null} onSave={onSave} />);

    expect(screen.getByText("No KPIs selected")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Add KPI"), { target: { value: "FRONTEND_QUALITY" } });

    const table = screen.getByRole("table");
    expect(within(table).getByText("FRONTEND_QUALITY")).toBeInTheDocument();
    expect(screen.queryByText("No KPIs selected")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      items: [{ key: "FRONTEND_QUALITY", expectedValue: 3, weight: 10, enabled: true }],
    }));
  });

  it("shows saved KPIs as selected rows when editing and leaves other KPIs available", () => {
    const initial: TemplateInput = {
      ...draft,
      items: [
        { key: "Q1", expectedValue: 4, weight: 60, enabled: true },
        { key: "FRONTEND_QUALITY", expectedValue: 3, weight: 40, enabled: false },
      ],
    };
    render(<TemplateForm initial={initial} keys={keys} busy={false} error={null} onSave={vi.fn()} />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Q1")).toBeInTheDocument();
    expect(within(table).queryByText("FRONTEND_QUALITY")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "FRONTEND_QUALITY — Frontend Quality" })).toBeInTheDocument();
  });
});
