import type { ReactNode } from "react";

/** Props shared by every icon. */
export interface IconProps {
  className?: string;
  /** Rendered width in px; the height follows the view box. Defaults to 24. */
  size?: number;
  /** Accessible name. Without it the icon is decorative and hidden from assistive tech. */
  title?: string;
}

interface IconBaseProps extends IconProps {
  children: ReactNode;
  /** Defaults to a 24x24 grid. */
  viewBox?: string;
  /**
   * Default value for parts painted with `currentColor`. It is a presentation attribute,
   * so a text colour class passed through `className` still wins.
   */
  color?: string;
}

export function IconBase({
  className,
  size = 24,
  title,
  children,
  viewBox = "0 0 24 24",
  color,
}: IconBaseProps) {
  const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
  const labelled = Boolean(title);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={Math.round(((size * height) / width) * 100) / 100}
      className={className}
      color={color}
      fill="none"
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      {labelled ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}
