import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Toggle } from "./toggle";

afterEach(cleanup);

describe("Toggle", () => {
  it("is a labelled switch that reports changes", async () => {
    const onCheckedChange = vi.fn();
    render(
      <>
        <label htmlFor="sound">Sound effects</label>
        <Toggle id="sound" checked={false} onCheckedChange={onCheckedChange} />
      </>,
    );
    const toggle = screen.getByRole("switch", { name: "Sound effects" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveClass("ui-switch");

    await userEvent.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("reflects the checked state", () => {
    render(<Toggle checked aria-label="Animations" onCheckedChange={() => undefined} />);
    expect(screen.getByRole("switch", { name: "Animations" })).toHaveAttribute(
      "data-state",
      "checked",
    );
  });

  it("does not change while disabled", async () => {
    const onCheckedChange = vi.fn();
    render(<Toggle disabled aria-label="Listening exercises" onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("switch", { name: "Listening exercises" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
