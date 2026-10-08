import type { ComponentPropsWithRef } from "react";

import { cn } from "./cn";

/** Pulsing placeholder; size and shape come from `className` (e.g. "h-4 w-32 rounded-full"). */
export function Skeleton({ className, ...props }: ComponentPropsWithRef<"span">) {
  return <span aria-hidden="true" className={cn("ui-skeleton", className)} {...props} />;
}
