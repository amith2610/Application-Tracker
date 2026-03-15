"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";

type ShareData =
  | {
      type: "board";
      applications: {
        id: string;
        company: string;
        role: string;
        stage: string;
        salary: string | null;
        appliedAt: string | null;
      }[];
      createdAt: string;
    }
  | {
      type: "application";
      application: {
        id: string;
        company: string;
        role: string;
        stage: string;
        salary: string | null;
        description: string | null;
        url: string | null;
        appliedAt: string | null;
        contacts: { name: string; email: string | null }[];
        activities: { id: string; type: string; date: string; note: string | null }[];
        documents: { filename: string; type: string }[];
      };
      createdAt: string;
    };

const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`/api/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 410 ? "Link expired" : "Not found");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-error">{error ?? "Share link not found"}</p>
        <Link
          href="/"
          className="text-primary transition-colors duration-150 hover:underline"
        >
          Go to Job Tracker
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Alert variant="warning" className="mb-6">
        <strong>Read-only shared view</strong> — This is a snapshot and cannot be
        edited.
      </Alert>

      {data.type === "board" ? (
        <>
          <h1 className="mb-6 text-2xl font-bold text-foreground">
            Job Applications Board
          </h1>
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
                {data.applications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-4 py-4 font-medium text-foreground">
                      {app.company} — {app.role}
                    </td>
                    <td className="px-4 py-4 text-sm text-secondary">
                      {STAGE_LABELS[app.stage] ?? app.stage}
                    </td>
                    <td className="px-4 py-4 text-sm text-secondary">
                      {app.salary ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-secondary">
                      {app.appliedAt
                        ? format(new Date(app.appliedAt), "PP")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.applications.length === 0 && (
            <p className="py-8 text-center text-muted">No applications</p>
          )}
        </>
      ) : (
        <>
          <h1 className="mb-6 text-2xl font-bold text-foreground">
            {data.application.company} — {data.application.role}
          </h1>
          <div className="space-y-6">
            <Card className="p-6">
              <p className="text-sm text-muted">
                {STAGE_LABELS[data.application.stage]}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted">Salary</span>
                  <p className="text-foreground">
                    {data.application.salary ?? "—"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted">Applied</span>
                  <p className="text-foreground">
                    {data.application.appliedAt
                      ? format(new Date(data.application.appliedAt), "PPp")
                      : "—"}
                  </p>
                </div>
              </div>
              {data.application.description && (
                <div className="mt-6">
                  <span className="text-sm text-muted">Description</span>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">
                    {data.application.description}
                  </p>
                </div>
              )}
            </Card>
            {data.application.contacts.length > 0 && (
              <Card className="p-6">
                <h2 className="font-semibold text-foreground">Contacts</h2>
                <ul className="mt-2 space-y-1">
                  {data.application.contacts.map((c) => (
                    <li key={c.name}>
                      {c.name}
                      {c.email && ` — ${c.email}`}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {data.application.activities.length > 0 && (
              <Card className="p-6">
                <h2 className="font-semibold text-foreground">Timeline</h2>
                <ul className="mt-4 space-y-3">
                  {data.application.activities.map((a) => (
                    <li key={a.id}>
                      <span className="font-medium capitalize text-foreground">{a.type}</span> —{" "}
                      {format(new Date(a.date), "PPp")}
                      {a.note && ` — ${a.note}`}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {data.application.documents.length > 0 && (
              <Card className="p-6">
                <h2 className="font-semibold text-foreground">Documents</h2>
                <ul className="mt-2 space-y-1 text-sm text-secondary">
                  {data.application.documents.map((d) => (
                    <li key={d.filename}>
                      {d.filename} ({d.type})
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">
                  Documents are not downloadable from shared view.
                </p>
              </Card>
            )}
          </div>
        </>
      )}

      <p className="mt-8 text-xs text-muted">
        Shared {format(new Date(data.createdAt), "PPp")}
      </p>
    </div>
  );
}
