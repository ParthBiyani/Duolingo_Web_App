import type { ComponentPropsWithRef, MouseEvent } from "react";

import { cn } from "./cn";

export type ButtonVariant =
  "primary" | "secondary" | "danger" | "outline" | "ghost" | "locked" | "super";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonStyleOptions {
  /** primary = green, secondary = blue, danger = red, outline = bordered, ghost = text only. */
  variant?: ButtonVariant;
  /** Heights: sm 40px, md 46px, lg 50px. */
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Class names for the 3D button skin. Use it to style a link as a button:
 * `<Link href="/practice" className={buttonClassName({ variant: "outline" })}>`.
 */
export function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn("ui-btn", `ui-btn-${variant}`, `ui-btn-${size}`, fullWidth && "ui-btn-full", className);
}

export interface ButtonProps extends ComponentPropsWithRef<"button">, ButtonStyleOptions {
  /** Shows a spinner and ignores clicks while keeping the button's size and colour. */
  loading?: boolean;
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  className,
  type = "button",
  onClick,
  children,
  ...props
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, fullWidth, className })}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      {...props}
    >
      {loading ? (
        <>
          <span className="ui-btn-label">{children}</span>
          <span className="ui-btn-spinner" aria-hidden="true" />
        </>
      ) : (
        children
      )}
    </button>
  );
}
