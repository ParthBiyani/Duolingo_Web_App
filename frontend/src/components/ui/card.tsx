import type { ComponentPropsWithRef } from "react";

import { cn } from "./cn";

export interface CardProps extends ComponentPropsWithRef<"div"> {
  /** Adds the 2px edge, hover tint and press movement used by clickable cards. */
  interactive?: boolean;
}

/** Bordered surface (2px border, 12px radius). Padding and layout come from `className`. */
export function Card({ interactive = false, className, ...props }: CardProps) {
  return (
    <div className={cn("ui-card", interactive && "ui-card-interactive", className)} {...props} />
  );
}
