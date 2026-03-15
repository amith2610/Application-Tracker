"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function DeleteZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: "delete-zone",
    data: { type: "delete-zone" },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[80px] max-w-[80px] shrink-0 flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed p-4 transition-colors",
        isOver
          ? "border-error bg-error-muted"
          : "border-border bg-border-muted"
      )}
      role="region"
      aria-label="Drop to delete application"
    >
      <TrashIcon
        className={cn(
          "h-6 w-6",
          isOver ? "text-error" : "text-muted"
        )}
      />
      <span
        className={cn(
          "text-center text-xs font-medium",
          isOver ? "text-error" : "text-muted"
        )}
      >
        {isOver ? "Release to delete" : "Drop to delete"}
      </span>
    </div>
  );
}
