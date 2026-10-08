import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Character, Mascot, type MascotPose } from "./index";

const POSES: MascotPose[] = ["idle", "cheer", "peek", "sad", "hug-heart", "celebrate", "lost"];

describe("Mascot", () => {
  it.each(POSES)("renders the %s pose as decoration by default", (pose) => {
    const { container } = render(<Mascot pose={pose} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "120");
  });

  it("is labelled when given a title", () => {
    render(<Mascot pose="sad" title="Sad owl" size={200} />);
    expect(screen.getByRole("img", { name: "Sad owl" })).toHaveAttribute("width", "200");
  });

  it("shows only the top half when peeking", () => {
    const { container } = render(<Mascot pose="peek" size={120} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 120 76");
    expect(svg).toHaveAttribute("height", "76");
  });
});

describe("Character", () => {
  it.each([1, 2, 3] as const)("renders variant %i", (variant) => {
    render(<Character variant={variant} title={`Learner ${variant}`} />);
    expect(screen.getByRole("img", { name: `Learner ${variant}` })).toBeInTheDocument();
  });
});
