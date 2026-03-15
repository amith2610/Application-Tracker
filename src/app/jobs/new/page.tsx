"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApplicationForm, type ApplicationFormData } from "@/components/forms/ApplicationForm";

export default function NewJobPage() {
  const router = useRouter();

  async function handleSubmit(data: ApplicationFormData) {
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        appliedAt: data.appliedAt
          ? new Date(data.appliedAt).toISOString()
          : new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to create");
    }
    const app = await res.json();
    router.push(`/jobs/${app.id}`);
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/jobs"
          className="text-sm text-muted transition-colors duration-150 hover:text-foreground"
        >
          ← Back to Jobs
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Add Job Application
      </h1>
      <div className="max-w-2xl">
        <ApplicationForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/jobs")}
        />
      </div>
    </div>
  );
}
