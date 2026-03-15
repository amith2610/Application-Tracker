"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import type { Application, Contact, Document, Activity } from "@prisma/client";
import { ApplicationForm, type ApplicationFormData } from "@/components/forms/ApplicationForm";
import { ShareButton } from "@/components/ui/ShareButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { STAGE_LABELS, type KanbanStage } from "@/lib/utils";

type ApplicationWithRelations = Application & {
  contacts: Contact[];
  documents: Document[];
  activities: Activity[];
  sourceEmailSubject?: string | null;
  sourceEmailSnippet?: string | null;
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [app, setApp] = useState<ApplicationWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch(`/api/applications/${id}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => setApp(data))
      .catch(() => setApp(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpdate(data: ApplicationFormData) {
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        appliedAt: data.appliedAt
          ? new Date(data.appliedAt).toISOString()
          : null,
      }),
    });
    if (!res.ok) throw new Error("Failed to update");
    const updated = await res.json();
    setApp(updated);
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this application?")) return;
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    router.push("/jobs");
  }

  if (loading || !app) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted">
          {loading ? "Loading..." : "Application not found"}
        </p>
      </div>
    );
  }

  const appliedAtFormatted = app.appliedAt
    ? format(new Date(app.appliedAt), "yyyy-MM-dd'T'HH:mm")
    : "";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/jobs"
          className="text-sm text-muted transition-colors duration-150 hover:text-foreground"
        >
          ← Back to Jobs
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton type="application" applicationId={id} label="Share" />
          <Button
            variant="secondary"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="max-w-2xl">
          <ApplicationForm
            defaultValues={{
              company: app.company,
              role: app.role,
              salary: app.salary ?? "",
              stage: app.stage as KanbanStage,
              description: app.description ?? "",
              url: app.url ?? "",
              appliedAt: appliedAtFormatted,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            submitLabel="Save Changes"
          />
        </div>
      ) : (
        <div className="space-y-8">
          <Card className="p-6">
            <h1 className="text-2xl font-bold text-foreground">
              {app.company} — {app.role}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {STAGE_LABELS[app.stage as KanbanStage]}
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-sm font-medium text-muted">Salary</span>
                <p className="text-foreground">{app.salary ?? "—"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted">
                  Applied
                </span>
                <p className="text-foreground">
                  {app.appliedAt
                    ? format(new Date(app.appliedAt), "PPp")
                    : "—"}
                </p>
              </div>
              {app.url && (
                <div className="sm:col-span-2">
                  <span className="text-sm font-medium text-muted">URL</span>
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-primary transition-colors duration-150 hover:underline"
                  >
                    {app.url}
                  </a>
                </div>
              )}
            </div>
            {app.description && (
              <div className="mt-6">
                <span className="text-sm font-medium text-muted">
                  Description
                </span>
                <p className="mt-1 whitespace-pre-wrap text-foreground">
                  {app.description}
                </p>
              </div>
            )}
            {(app.sourceEmailSubject ?? app.sourceEmailId) && (
              <div className="mt-6">
                <span className="text-sm font-medium text-muted">
                  Original email
                </span>
                <p className="mt-1 font-medium text-foreground">
                  {app.sourceEmailSubject ?? "(No subject)"}
                </p>
                {app.sourceEmailSnippet && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-[var(--radius-md)] border border-border bg-border-muted p-3 text-sm whitespace-pre-wrap text-secondary">
                    {app.sourceEmailSnippet}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Activity Timeline */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">
              Activity Timeline
            </h2>
            <Link
              href={`/jobs/${id}/activities`}
              className="mt-2 inline-block text-sm text-primary transition-colors duration-150 hover:underline"
            >
              Add activity
            </Link>
            <ul className="mt-4 space-y-4">
              {app.activities.length === 0 ? (
                <li className="text-sm text-muted">No activities yet</li>
              ) : (
                app.activities.map((a) => (
                  <li key={a.id} className="flex gap-4">
                    <div className="h-3 w-3 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="font-medium capitalize text-foreground">
                        {a.type}
                      </p>
                      <p className="text-sm text-muted">
                        {format(new Date(a.date), "PPp")}
                      </p>
                      {a.note && (
                        <p className="mt-1 text-sm text-secondary">{a.note}</p>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>

          {/* Contacts */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Contacts</h2>
            <Link
              href={`/contacts?applicationId=${id}`}
              className="mt-2 inline-block text-sm text-primary transition-colors duration-150 hover:underline"
            >
              Manage contacts
            </Link>
            <ul className="mt-4 space-y-2">
              {app.contacts.length === 0 ? (
                <li className="text-sm text-muted">No contacts linked</li>
              ) : (
                app.contacts.map((c) => (
                  <li key={c.id} className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{c.name}</span>
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="text-primary transition-colors duration-150 hover:underline"
                      >
                        {c.email}
                      </a>
                    )}
                  </li>
                ))
              )}
            </ul>
          </Card>

          {/* Documents */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-foreground">Documents</h2>
            <Link
              href={`/jobs/${id}/documents`}
              className="mt-2 inline-block text-sm text-primary transition-colors duration-150 hover:underline"
            >
              Upload documents
            </Link>
            <ul className="mt-4 space-y-2">
              {app.documents.length === 0 ? (
                <li className="text-sm text-muted">No documents</li>
              ) : (
                app.documents.map((d) => (
                  <li key={d.id}>
                    <a
                      href={`/api/documents/${d.id}/download`}
                      className="text-sm text-primary transition-colors duration-150 hover:underline"
                    >
                      {d.filename} ({d.type})
                    </a>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
