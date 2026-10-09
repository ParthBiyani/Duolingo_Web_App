import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";

import * as icons from "./index";

type AnyIcon = ComponentType<Record<string, unknown>>;

const ALL = Object.entries(icons).filter(([, value]) => typeof value === "function") as unknown as [
  string,
  AnyIcon,
][];

/** Props an icon needs beyond the shared ones. */
const REQUIRED: Record<string, Record<string, unknown>> = {
  Medal: { place: 2 },
  LeagueBadge: { tier: 1 },
  DuoImage: { name: "gem" },
};

describe("icons", () => {
  it("exports every icon the app imports", () => {
    expect(ALL.map(([name]) => name).sort()).toEqual(
      [
        "Flame",
        "Gem",
        "Heart",
        "HeartEmpty",
        "Bolt",
        "Crown",
        "Star",
        "Chest",
        "ChestOpen",
        "Dumbbell",
        "Trophy",
        "Lock",
        "Check",
        "Close",
        "Speaker",
        "FlagES",
        "FlagUS",
        "House",
        "Shield",
        "Store",
        "ProfileIcon",
        "Dots",
        "Gear",
        "Book",
        "ArrowLeft",
        "Medal",
        "Target",
        "Clock",
        "Snowflake",
        "Mic",
        "BannerBack",
        "DuoImage",
        "Guidebook",
        "HeartRefill",
        "HeartUnlimited",
        "LeagueBadge",
        "Logo",
        "NavLeaderboards",
        "NavQuests",
        "QuestChest",
        "StatMedal",
        "StatStreak",
        "StatXp",
        "SuperLogo",
        "SuperOwl",
      ].sort(),
    );
  });

  it.each(ALL)("%s is decorative without a title", (name, Icon) => {
    const { container } = render(<Icon {...REQUIRED[name]} />);
    // Drawn icons are inline SVG; the original artwork is an <img> of its SVG file.
    const graphic = container.querySelector("svg, img");
    expect(graphic).toHaveAttribute("aria-hidden", "true");
    expect(graphic).not.toHaveAttribute("role");
    expect(graphic).toHaveAttribute("width", "24");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it.each(ALL)("%s uses its title as the accessible name", (name, Icon) => {
    render(<Icon {...REQUIRED[name]} title={`${name} label`} size={40} className="extra" />);
    const img = screen.getByRole("img", { name: `${name} label` });
    expect(img).not.toHaveAttribute("aria-hidden");
    expect(img).toHaveAttribute("width", "40");
    expect(img).toHaveClass("extra");
  });

  it("greys out the flame when muted", () => {
    const { container, rerender } = render(<icons.Flame />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/duo/streak.svg");
    rerender(<icons.Flame muted />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/duo/streak-off.svg");
  });

  it("paints the shield in the given colour", () => {
    const { container } = render(<icons.Shield color="#CD7F32" />);
    expect(container.querySelector('path[fill="#CD7F32"]')).not.toBeNull();
  });

  it("numbers the medal by place", () => {
    render(<icons.Medal place={3} title="Third place" />);
    expect(screen.getByRole("img", { name: "Third place" })).toHaveTextContent("3");
  });

  it("lets path nodes recolour the star", () => {
    const { container } = render(<icons.Star fill="#AFAFAF" />);
    expect(container.querySelector("path")).toHaveAttribute("fill", "#AFAFAF");
  });

  it("gives each US flag its own clip path id", () => {
    const { container } = render(
      <>
        <icons.FlagUS />
        <icons.FlagUS />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("clipPath")).map((node) => node.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
