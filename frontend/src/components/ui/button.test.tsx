import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button, buttonClassName } from "./button";

afterEach(cleanup);

describe("Button", () => {
  it("renders a non-submitting primary button by default", () => {
    render(<Button>Check</Button>);
    const button = screen.getByRole("button", { name: "Check" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("ui-btn", "ui-btn-primary", "ui-btn-md");
  });

  it("applies the variant, size, width and extra classes", () => {
    render(
      <Button variant="danger" size="lg" fullWidth className="mt-4">
        Quit
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Quit" })).toHaveClass(
      "ui-btn-danger",
      "ui-btn-lg",
      "ui-btn-full",
      "mt-4",
    );
  });

  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Continue</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Check
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Check" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("ignores clicks and announces itself busy while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Refill
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Refill" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    // Stays enabled so it keeps its colour; the label is kept (hidden) to hold its width.
    expect(button).toBeEnabled();
    expect(button.querySelector(".ui-btn-spinner")).not.toBeNull();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards native attributes", () => {
    render(
      <Button type="submit" aria-label="Save changes" data-testid="save">
        Save
      </Button>,
    );
    const button = screen.getByTestId("save");
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAccessibleName("Save changes");
  });
});

describe("buttonClassName", () => {
  it("builds the same skin for links styled as buttons", () => {
    expect(buttonClassName({ variant: "outline", size: "sm", className: "w-40" })).toBe(
      "ui-btn ui-btn-outline ui-btn-sm w-40",
    );
  });

  it("defaults to a medium primary button", () => {
    expect(buttonClassName()).toBe("ui-btn ui-btn-primary ui-btn-md");
  });
});
