import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageHeader, Switch } from "./ui";

describe("shared UI", () => {
  it("renders page hierarchy and invokes the accessible switch", () => {
    const onChange = vi.fn();
    render(<><PageHeader title="People" description="Manage reporting lines" /><Switch checked={false} onChange={onChange} label="Is Manager" /></>);
    expect(screen.getByRole("heading", { name: "People" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Is Manager" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
