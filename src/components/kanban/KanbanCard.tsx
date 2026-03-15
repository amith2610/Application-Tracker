"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Application } from "@prisma/client";
import type { KanbanStage } from "@/lib/utils";

type ApplicationWithRelations = Application & {
  contacts: { id: string }[];
  documents: { id: string }[];
  activities: { id: string }[];
};

type KanbanCardProps = {
  application: ApplicationWithRelations;
};

const STAGE_BORDER_COLORS: Record<KanbanStage, string> = {
  applied: "border-l-4 border-l-[var(--stage-applied)]",
  interviewing: "border-l-4 border-l-[var(--stage-interviewing)]",
  offer: "border-l-4 border-l-[var(--stage-offer)]",
  rejected: "border-l-4 border-l-[var(--stage-rejected)]",
};

export function KanbanCard({ application }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id,
    data: { application, type: "card" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const stage = application.stage as KanbanStage;
  const borderColor = STAGE_BORDER_COLORS[stage] ?? "border-l-stage-applied";
  const date = application.appliedAt ?? application.createdAt;
  const timeAgo = date ? formatDistanceToNow(new Date(date), { addSuffix: false }) : null;
  const timeLabel = timeAgo ? (timeAgo.includes("day") ? timeAgo.replace(" days", "d").replace(" day", "d") : timeAgo.includes("week") ? timeAgo.replace(" weeks", "w").replace(" week", "w") : timeAgo.includes("month") ? timeAgo.replace(" months", "mo").replace(" month", "mo") : timeAgo.includes("hour") ? timeAgo.replace(" hours", "h").replace(" hour", "h") : timeAgo.includes("minute") ? timeAgo.replace(" minutes", "m").replace(" minute", "m") : timeAgo) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-[var(--radius-md)] border border-border bg-surface p-3 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)] ${borderColor} ${
        isDragging
          ? "rotate-[2deg] opacity-95 shadow-[var(--shadow-lg)] ring-2 ring-primary"
          : ""
      }`}
    >
      <Link
        href={`/jobs/${application.id}`}
        className="block"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-semibold text-foreground">{application.role}</p>
        <p className="text-sm text-secondary">{application.company}</p>
        {timeLabel && (
          <p className="mt-1 text-xs text-muted">{timeLabel}</p>
        )}
      </Link>
    </div>
  );
}
