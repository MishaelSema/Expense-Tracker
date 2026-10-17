"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-11 w-full min-w-0 rounded-xl bg-[var(--surface-secondary)] px-3.5 text-[16px] text-[var(--foreground)] placeholder:text-[var(--foreground-secondary)] border border-transparent transition-colors focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:outline-none disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
