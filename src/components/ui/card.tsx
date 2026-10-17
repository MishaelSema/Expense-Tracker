"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[var(--surface)] border border-[var(--separator)]",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-5 pt-5 flex items-center justify-between gap-3", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-[17px] font-semibold tracking-apple text-[var(--foreground)]",
        className
      )}
      {...props}
    />
  );
}

function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

/** Grouped-list card: rows separated by hairlines, iOS Settings style. */
function CardList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[var(--surface)] border border-[var(--separator)] overflow-hidden divide-y divide-[var(--separator)]",
        className
      )}
      {...props}
    />
  );
}

function CardRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-3 px-5 min-h-[52px] py-2.5", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-5 py-3 text-[13px] text-[var(--foreground-secondary)]", className)}
      {...props}
    />
  );
}

// Backwards-compatible alias.
const CardContent = CardBody;

export { Card, CardHeader, CardTitle, CardContent, CardBody, CardList, CardRow, CardFooter };
