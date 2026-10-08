"use client";

import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithRef } from "react";

import { cn } from "./cn";

export const Dropdown = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;
export const DropdownGroup = DropdownPrimitive.Group;

/** Menu panel in a portal, with roving focus, typeahead and Escape to close. */
export function DropdownContent({
  sideOffset = 8,
  collisionPadding = 16,
  className,
  ...props
}: ComponentPropsWithRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn("ui-panel ui-menu", className)}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

/** Caps menu row. Use `onSelect` for actions, or `asChild` around a Link to navigate. */
export function DropdownItem({
  className,
  ...props
}: ComponentPropsWithRef<typeof DropdownPrimitive.Item>) {
  return <DropdownPrimitive.Item className={cn("ui-menu-item", className)} {...props} />;
}

export function DropdownSeparator({
  className,
  ...props
}: ComponentPropsWithRef<typeof DropdownPrimitive.Separator>) {
  return <DropdownPrimitive.Separator className={cn("ui-menu-separator", className)} {...props} />;
}
