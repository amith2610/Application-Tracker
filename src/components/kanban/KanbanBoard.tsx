"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverEvent,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Application } from "@prisma/client";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { DeleteZone } from "./DeleteZone";
import { KANBAN_STAGES, STAGE_LABELS, type KanbanStage } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";

type ApplicationWithRelations = Application & {
  contacts: { id: string }[];
  documents: { id: string }[];
  activities: { id: string }[];
};

export function KanbanBoard() {
  const [applications, setApplications] = useState<ApplicationWithRelations[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/applications")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load applications");
        return res.json();
      })
      .then((data) => {
        setApplications(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((e) => {
        setError(e.message);
        setApplications([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function getApplicationsByStage(stage: KanbanStage) {
    return applications.filter((a) => a.stage === stage);
  }

  async function handleDragOver(event: DragOverEvent) {
    // Optional: could show preview of drop target
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeApp = applications.find((a) => a.id === active.id);
    const overData = over.data?.current;

    if (!activeApp) return;

    // Drop on delete zone: delete the application
    if (overData?.type === "delete-zone") {
      const res = await fetch(`/api/applications/${active.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.filter((a) => a.id !== active.id)
        );
      }
      return;
    }

    // over can be a column (stage) or a card
    let newStage: KanbanStage;
    if (overData?.type === "column") {
      newStage = overData.stage as KanbanStage;
    } else if (overData?.application) {
      newStage = (overData.application as ApplicationWithRelations)
        .stage as KanbanStage;
    } else {
      return;
    }

    if (activeApp.stage === newStage) return;

    // Optimistic update
    setApplications((prev) =>
      prev.map((a) =>
        a.id === active.id ? { ...a, stage: newStage } : a
      )
    );

    const res = await fetch(`/api/applications/${active.id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });

    if (!res.ok) {
      // Revert on error
      setApplications((prev) =>
        prev.map((a) =>
          a.id === active.id ? { ...a, stage: activeApp.stage } : a
        )
      );
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted">Loading board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" className="p-6">
        <p className="font-medium">{error}</p>
        <p className="mt-2 text-sm">
          Make sure the database is set up. Run: npx prisma migrate dev
        </p>
      </Alert>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            title={STAGE_LABELS[stage]}
            applications={getApplicationsByStage(stage)}
            isOver={activeId !== null}
          />
        ))}
        {activeId != null && <DeleteZone />}
      </div>
    </DndContext>
  );
}
