"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EnvelopeIcon, PlusIcon, EllipsisIcon } from "@/components/ui/Icons";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  company: string | null;
  linkedToApplicationId: string | null;
  createdAt?: string;
};

type Application = {
  id: string;
  company: string;
  role: string;
};

const labelClass = "mb-1 block text-sm font-medium text-secondary";

function ContactsContent() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    company: "",
    linkedToApplicationId: applicationId || "",
  });

  useEffect(() => {
    Promise.all([
      fetch(
        applicationId
          ? `/api/contacts?applicationId=${applicationId}`
          : "/api/contacts"
      ).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/applications").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([contactsData, appsData]) => {
        setContacts(Array.isArray(contactsData) ? contactsData : []);
        setApplications(Array.isArray(appsData) ? appsData : []);
        if (applicationId) {
          setFormData((prev) => ({
            ...prev,
            linkedToApplicationId: applicationId,
          }));
        }
      })
      .catch(() => {
        setContacts([]);
        setApplications([]);
      })
      .finally(() => setLoading(false));
  }, [applicationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        email: formData.email || null,
        linkedToApplicationId: formData.linkedToApplicationId || null,
      }),
    });
    if (!res.ok) throw new Error("Failed to create");
    const newContact = await res.json();
    setContacts((prev) => [newContact, ...prev]);
    setFormData({
      name: "",
      email: "",
      role: "",
      company: "",
      linkedToApplicationId: applicationId || "",
    });
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete");
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  const getAppLabel = (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    return app ? `${app.company} — ${app.role}` : appId;
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted">Loading...</div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
        <Button
          onClick={() => setShowForm(!showForm)}
          variant="primary"
          className="inline-flex items-center gap-2"
        >
          <PlusIcon className="size-4" />
          {showForm ? "Cancel" : "Contact"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-medium text-foreground">
              New Contact
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Name *</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <Input
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, role: e.target.value }))
                  }
                  placeholder="Recruiter"
                />
              </div>
              <div>
                <label className={labelClass}>Company</label>
                <Input
                  value={formData.company}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, company: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Linked to Application
                </label>
                <Select
                  value={formData.linkedToApplicationId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      linkedToApplicationId: e.target.value,
                    }))
                  }
                >
                  <option value="">— None —</option>
                  {applications.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.company} — {a.role}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Button type="submit" variant="primary">
                Add Contact
              </Button>
            </div>
          </Card>
        </form>
      )}

      {contacts.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-border bg-surface py-12 text-center">
          <p className="text-muted">No contacts yet.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-2 text-sm text-primary transition-colors duration-150 hover:underline"
          >
            Add your first contact
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={c.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-sm text-muted">
                        {[c.role, c.company].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                        className="rounded p-1 text-muted transition-colors hover:bg-border-muted hover:text-foreground"
                        aria-label="Options"
                      >
                        <EllipsisIcon className="size-4" />
                      </button>
                      {openMenuId === c.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            aria-hidden
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-[var(--radius-md)] border border-border bg-surface py-1 shadow-[var(--shadow-md)]">
                            <button
                              type="button"
                              className="w-full px-3 py-1.5 text-left text-sm text-error hover:bg-error-muted"
                              onClick={() => {
                                setOpenMenuId(null);
                                handleDelete(c.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-secondary">
                    <EnvelopeIcon className="size-4 shrink-0" />
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        className="truncate text-primary hover:underline"
                      >
                        {c.email}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Added {c.createdAt ? format(new Date(c.createdAt), "MMM d, yyyy") : "—"}
                  </p>
                  {c.linkedToApplicationId && (
                    <Link
                      href={`/jobs/${c.linkedToApplicationId}`}
                      className="mt-2 block text-xs text-primary hover:underline"
                    >
                      {getAppLabel(c.linkedToApplicationId)}
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted">Loading...</div>}>
      <ContactsContent />
    </Suspense>
  );
}
