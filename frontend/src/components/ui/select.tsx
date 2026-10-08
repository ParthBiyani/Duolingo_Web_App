import type { ChangeEvent, ComponentPropsWithRef } from "react";

import { cn } from "./cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<ComponentPropsWithRef<"select">, "children"> {
  options: readonly SelectOption[];
  /** Called with the chosen option's value. */
  onValueChange?: (value: string) => void;
}

/**
 * Native <select> in the field skin. Native keeps keyboard, screen-reader and
 * mobile pickers working without extra code.
 */
export function Select({ options, onValueChange, onChange, className, ...props }: SelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  return (
    <span className={cn("ui-select-wrap", className)}>
      <select className="ui-select" onChange={handleChange} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="ui-select-chevron"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M3 6l5 5 5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
