"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithRef } from "react";

import { cn } from "./cn";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export interface PopoverContentProps extends ComponentPropsWithRef<
  typeof PopoverPrimitive.Content
> {
  /** Draws the bordered arrow pointing at the trigger. Defaults to true. */
  arrow?: boolean;
  /** Recolours the arrow, e.g. "fill-unit-green stroke-unit-green" for a coloured popover. */
  arrowClassName?: string;
  /** Drops the default panel skin (border, background, padding) to style from scratch. */
  unstyled?: boolean;
}

/** Floating panel in a portal: 2px border, 16px radius, keyboard accessible and dismissible. */
export function PopoverContent({
  arrow = true,
  arrowClassName,
  unstyled = false,
  sideOffset = 12,
  collisionPadding = 16,
  className,
  children,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(!unstyled && "ui-panel", className)}
        {...props}
      >
        {children}
        {arrow ? (
          <PopoverPrimitive.Arrow asChild width={24} height={10}>
            <PanelArrow className={arrowClassName} />
          </PopoverPrimitive.Arrow>
        ) : null}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

/**
 * Triangle whose base starts 2px inside the panel, covering the panel border so
 * the outline runs continuously around the arrow. Radix rotates it per side.
 */
export function PanelArrow({ className, ...props }: ComponentPropsWithRef<"svg">) {
  return (
    <svg viewBox="0 0 24 10" aria-hidden="true" className={cn("ui-arrow", className)} {...props}>
      <path d="M0 -2 L12 10 L24 -2" />
    </svg>
  );
}
