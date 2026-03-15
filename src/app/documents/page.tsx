"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/Card";

type Document = {
  id: string;
  filename: string;
  type: string;
  applicationId: string;
  createdAt?: string;
};

type Application = {
  id: string;
  company: string;
  role: string;
};

type FilterTab = "all" | "cover" | "resume";

function getFileBadge(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "PDF";
  if (ext === "txt") return "TXT";
  return "File";
}

function getFileBadgeColor(badge: string): string {
  if (badge === "PDF") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  if (badge === "TXT") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-border-muted text-muted";
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/documents").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/applications").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([docsData, appsData]) => {
        setDocuments(Array.isArray(docsData) ? docsData : []);
        setApplications(Array.isArray(appsData) ? appsData : []);
      })
      .catch(() => {
        setDocuments([]);
        setApplications([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const getAppLabel = (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    return app ? `${app.company} — ${app.role}` : appId;
  };

  const coverCount = documents.filter((d) => d.type === "cover").length;
  const resumeCount = documents.filter((d) => d.type === "resume").length;

  const filtered =
    filter === "all"
      ? documents
      : documents.filter((d) => d.type === filter);

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "cover", label: "Cover Letter", count: coverCount },
    { key: "resume", label: "Resume", count: resumeCount },
  ];

  if (loading) {
    return (
      <div className="py-12 text-center text-muted">Loading...</div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Documents</h1>

      {documents.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface py-12 text-center">
          <p className="text-muted">
            No documents yet. Upload resumes and cover letters from job detail
            pages.
          </p>
          <Link
            href="/jobs"
            className="mt-2 inline-block text-sm text-primary transition-colors duration-150 hover:underline"
          >
            Go to Jobs →
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 flex gap-1 border-b border-border">
            {tabs.map((tab) => {
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive ? "bg-primary-muted" : "bg-border-muted"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d) => {
              const badge = getFileBadge(d.filename);
              return (
                <Card key={d.id} className="p-4">
                  <p className="mb-2 text-xs text-muted">User Upload</p>
                  <div className="mb-2 flex justify-center">
                    <span
                      className={`inline-flex size-12 items-center justify-center rounded-full text-sm font-medium ${getFileBadgeColor(badge)}`}
                    >
                      {badge}
                    </span>
                  </div>
                  <p className="truncate text-center font-semibold text-foreground" title={d.filename}>
                    {d.filename}
                  </p>
                  <p className="mt-1 text-center text-sm text-muted">
                    {d.type === "resume" ? "Resume" : "Cover Letter"}
                    {badge !== "File" ? ` — ${badge}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    <span className="rounded-full bg-primary-muted px-2 py-0.5 text-xs font-medium text-primary">
                      {d.type === "resume" ? "Resume" : "Cover Letter"}
                    </span>
                  </div>
                  <p className="mt-2 text-center text-xs text-muted">
                    Added {d.createdAt ? formatDistanceToNow(new Date(d.createdAt), { addSuffix: true }) : "—"}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <a
                      href={`/api/documents/${d.id}/download`}
                      download={d.filename}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Download
                    </a>
                    <Link
                      href={`/jobs/${d.applicationId}`}
                      className="text-sm text-muted hover:text-primary hover:underline"
                    >
                      {getAppLabel(d.applicationId)}
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
