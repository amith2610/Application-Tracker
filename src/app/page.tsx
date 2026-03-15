import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export default function HomePage() {
  return (
    <div className="min-h-full">
      <div className="rounded-[var(--radius-lg)] p-4" style={{ backgroundColor: "var(--board-background)" }}>
        <KanbanBoard />
      </div>
    </div>
  );
}
