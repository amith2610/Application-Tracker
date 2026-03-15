"use client";

import { cn } from "@/lib/utils";
import type { KanbanStage } from "@/lib/utils";

type BadgeVariant = KanbanStage | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  applied: "bg-stage-applied-muted text-stage-applied",
  interviewing: "bg-stage-interviewing-muted text-stage-interviewing",
  offer: "bg-stage-offer-muted text-stage-offer",
  rejected: "bg-stage-rejected-muted text-stage-rejected",
  neutral: "bg-border-muted text-secondary",
};

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
