"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium select-none pressable disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
        secondary:
          "bg-[var(--surface-secondary)] text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--surface-secondary)_85%,var(--foreground)_8%)]",
        ghost:
          "text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]",
        "ghost-destructive":
          "text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]",
        destructive:
          "bg-[var(--danger)] text-white hover:opacity-90",
        outline:
          "border border-[var(--separator)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)]",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px] rounded-full",
        md: "h-10 px-4 text-[15px] rounded-full",
        lg: "h-12 px-6 text-[17px] rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
