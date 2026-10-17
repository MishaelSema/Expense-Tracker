"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-[13px] font-medium text-[var(--foreground-secondary)] block mb-1.5",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
