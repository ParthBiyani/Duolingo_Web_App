"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentPropsWithRef } from "react";

import { cn } from "./cn";

export type ToggleProps = Omit<ComponentPropsWithRef<typeof SwitchPrimitive.Root>, "children">;

/**
 * Blue pill switch (role="switch"). Label it with a <label htmlFor> or
 * `aria-label`; control it with `checked` and `onCheckedChange`.
 */
export function Toggle({ className, ...props }: ToggleProps) {
  return (
    <SwitchPrimitive.Root className={cn("ui-switch", className)} {...props}>
      <SwitchPrimitive.Thumb className="ui-switch-thumb" />
    </SwitchPrimitive.Root>
  );
}
