import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toast, Toaster } from "./toast";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // The toast store lives at module level: empty it between tests.
  act(() => {
    toast.dismiss();
    vi.runOnlyPendingTimers();
  });
  cleanup();
  vi.useRealTimers();
});

describe("toast", () => {
  it("shows a toast and removes it after its duration", () => {
    render(<Toaster />);

    act(() => {
      toast("Coming soon", { duration: 2000 });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Coming soon");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("status")).toHaveAttribute("data-leaving");

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces errors as alerts and replaces toasts that share an id", () => {
    render(<Toaster />);

    act(() => {
      toast.error("Can't reach the server", { id: "network" });
      toast.error("Can't reach the server", { id: "network" });
    });

    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("runs the action and dismisses the toast", () => {
    const retry = vi.fn();
    render(<Toaster />);

    act(() => {
      toast("We couldn't refresh your data.", { action: { label: "Retry", onClick: retry } });
    });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveAttribute("data-leaving");
  });

  it("can be dismissed by hand", () => {
    render(<Toaster />);

    act(() => {
      toast.success("Hearts refilled!");
    });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
