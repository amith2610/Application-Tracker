import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const KANBAN_STAGES = [
  "applied",
  "interviewing",
  "offer",
  "rejected",
] as const;

export type KanbanStage = (typeof KANBAN_STAGES)[number];

export const STAGE_LABELS: Record<KanbanStage, string> = {
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};
