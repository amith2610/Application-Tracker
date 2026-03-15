"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";

type Document = {
  id: string;
  filename: string;
  path: string;
  type: string;
};

type Application = {
  company: string;
  role: string;
};

const labelClass = "mb-1 block text-sm font-medium text-secondary";

export default function JobDocumentsPage() {
  const params = useParams();
  const id = params.id as string;
  const [documents, setDocuments] = useState<Document[]>([]);
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/applications/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/documents?applicationId=${id}`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([appData, docsData]) => {
        setApp(appData);
        setDocuments(Array.isArray(docsData) ? docsData : []);
      })
      .catch(() => {
        setApp(null);
        setDocuments([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    formData.set("type", (form.querySelector('select[name="type"]') as HTMLSelectElement).value);

    setUploading(true);
    try {
      const res = await fetch(`/api/applications/${id}/documents`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }
      const doc = await res.json();
      setDocuments((prev) => [doc, ...prev]);
      form.reset();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }

  if (loading || !app) {
    return (
      <div className="py-12 text-center text-muted">Loading...</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/jobs/${id}`}
          className="text-sm text-muted transition-colors duration-150 hover:text-foreground"
        >
          ← Back to {app.company} — {app.role}
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-bold text-foreground">Documents</h1>

      <form onSubmit={handleUpload} className="mb-8">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-medium text-foreground">
            Upload Document
          </h2>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className={labelClass}>Type</label>
              <Select name="type">
                <option value="resume">Resume</option>
                <option value="cover">Cover Letter</option>
              </Select>
            </div>
            <div>
              <label className={labelClass}>File</label>
              <input
                name="file"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                required
                className="block w-full text-sm text-secondary file:mr-4 file:rounded-[var(--radius-md)] file:border-0 file:bg-primary-muted file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:opacity-90"
              />
            </div>
            <Button type="submit" disabled={uploading} variant="primary">
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </Card>
      </form>

      <ul className="space-y-2">
        {documents.length === 0 ? (
          <li className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface py-8 text-center text-muted">
            No documents yet. Upload a resume or cover letter above.
          </li>
        ) : (
          documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3"
            >
              <a
                href={`/api/documents/${d.id}/download`}
                download={d.filename}
                className="text-primary transition-colors duration-150 hover:underline"
              >
                {d.filename}
                <span className="ml-2 text-xs text-muted">({d.type})</span>
              </a>
              <button
                type="button"
                onClick={() => handleDelete(d.id)}
                className="text-sm text-error transition-colors duration-150 hover:underline"
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
