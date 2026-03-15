"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Application } from "@prisma/client";
import { STAGE_LABELS, type KanbanStage } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export default function JobsPage() {
  const [applications, setApplications] = useState<
    (Application & { stage: string })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applications")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setApplications(Array.isArray(data) ? data : []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted">Loading applications...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Job Applications</h1>
        <Link
          href="/jobs/new"
          className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Add Application
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface py-12 text-center">
          <p className="mb-4 text-muted">
            No applications yet. Add your first job application to get started.
          </p>
          <Link
            href="/jobs/new"
            className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Add Application
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-sm)]">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-border-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  Company / Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  Salary
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                  Applied
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {applications.map((app) => (
                <tr key={app.id} className="transition-colors duration-150 hover:bg-border-muted">
                  <td className="px-4 py-4">
                    <Link
                      href={`/jobs/${app.id}`}
                      className="font-medium text-primary transition-colors duration-150 hover:underline"
                    >
                      {app.company} — {app.role}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={(app.stage as KanbanStage) || "neutral"}>
                      {STAGE_LABELS[app.stage as KanbanStage] ?? app.stage}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-sm text-secondary">
                    {app.salary ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-secondary">
                    {app.appliedAt
                      ? new Date(app.appliedAt).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
