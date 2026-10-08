import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "./button";
import { Modal, ModalTitle } from "./modal";

afterEach(cleanup);

describe("Modal", () => {
  it("is a dialog named by its title and moves focus inside", () => {
    render(
      <Modal
        open
        onOpenChange={() => undefined}
        title="Wait, don't go!"
        description="You'll lose your progress."
      >
        <Button>Keep learning</Button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Wait, don't go!" });
    expect(dialog).toHaveAccessibleDescription("You'll lose your progress.");
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("supports a custom title inside the content", () => {
    render(
      <Modal open onOpenChange={() => undefined}>
        <ModalTitle>You ran out of hearts!</ModalTitle>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "You ran out of hearts!" })).toBeInTheDocument();
  });

  it("can keep the title for screen readers only", () => {
    render(
      <Modal open onOpenChange={() => undefined} title="Daily goal" hideTitle>
        <p>Pick a goal</p>
      </Modal>,
    );
    expect(screen.getByText("Daily goal")).toHaveClass("sr-only");
  });

  it("closes on Escape when dismissible", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Quit lesson?">
        <Button>Keep learning</Button>
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("ignores Escape when not dismissible", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Out of hearts" dismissible={false}>
        <Button>Refill</Button>
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("renders nothing while closed", () => {
    render(
      <Modal open={false} onOpenChange={() => undefined} title="Hidden">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
