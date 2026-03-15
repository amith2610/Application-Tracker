"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";
import type { Application } from "@prisma/client";
import { KanbanCard } from "./KanbanCard";
import { DocumentIcon, BriefcaseIcon, TrophyIcon, XIcon, PlusIcon } from "@/components/ui/Icons";
import type { KanbanStage } from "@/lib/utils";

type ApplicationWithRelations = Application & {
  contacts: { id: string }[];
  documents: { id: string }[];
  activities: { id: string }[];
};

type KanbanColumnProps = {
  stage: KanbanStage;
  title: string;
  applications: ApplicationWithRelations[];
  isOver?: boolean;
};

const STAGE_ICONS: Record<KanbanStage, React.ComponentType<{ className?: string }>> = {
  applied: DocumentIcon,
  interviewing: BriefcaseIcon,
  offer: TrophyIcon,
  rejected: XIcon,
};

export function KanbanColumn({
  stage,
  title,
  applications,
  isOver,
}: KanbanColumnProps) {
  const { setNodeRef, isOver: isOverColumn } = useDroppable({
    id: `column-${stage}`,
    data: { type: "column", stage },
  });

  const StageIcon = STAGE_ICONS[stage];

  return (
    <div
      ref={setNodeRef}
      className={`min-w-[280px] max-w-[280px] shrink-0 rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-md)] transition-colors ${
        isOverColumn ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <StageIcon className="size-4 text-muted" />
        <h3 className="font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
      </div>
      <p className="mb-4 text-xs text-muted">
        {applications.length} {applications.length === 1 ? "JOB" : "JOBS"}
      </p>
      <SortableContext
        items={applications.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {applications.map((app) => (
            <KanbanCard key={app.id} application={app} />
          ))}
        </div>
      </SortableContext>
      <Link
        href="/jobs/new"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed border-border-muted bg-border-muted/50 py-3 text-sm font-medium text-muted transition-colors hover:border-primary hover:bg-primary-muted hover:text-primary"
      >
        <PlusIcon className="size-5" />
        Add
      </Link>
    </div>
  );
}
