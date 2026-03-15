"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";

const schema = z.object({
  type: z.enum(["applied", "interview", "offer", "rejection"]),
  date: z.string().min(1, "Date is required"),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type Activity = {
  id: string;
  type: string;
  date: string;
  note: string | null;
};

const labelClass = "mb-1 block text-sm font-medium text-secondary";

export default function ActivitiesPage() {
  const params = useParams();
  const id = params.id as string;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [app, setApp] = useState<{ company: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "interview",
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/applications/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/applications/${id}/activities`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([appData, activitiesData]) => {
        setApp(appData);
        setActivities(Array.isArray(activitiesData) ? activitiesData : []);
      })
      .catch(() => {
        setApp(null);
        setActivities([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function onSubmit(data: FormData) {
    const res = await fetch(`/api/applications/${id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        date: new Date(data.date).toISOString(),
      }),
    });
    if (!res.ok) throw new Error("Failed to add");
    const newActivity = await res.json();
    setActivities((prev) => [newActivity, ...prev]);
    reset({ type: "interview", date: format(new Date(), "yyyy-MM-dd'T'HH:mm") });
  }

  async function handleDelete(activityId: string) {
    const res = await fetch(`/api/activities/${activityId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete");
    setActivities((prev) => prev.filter((a) => a.id !== activityId));
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

      <h1 className="mb-6 text-2xl font-bold text-foreground">Activity Timeline</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mb-8">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-medium text-foreground">Add Activity</h2>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className={labelClass}>Type</label>
              <Select {...register("type")}>
                <option value="applied">Applied</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejection">Rejection</option>
              </Select>
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <Input type="datetime-local" {...register("date")} />
            </div>
            <div className="min-w-[200px] flex-1">
              <label className={labelClass}>Note</label>
              <Input
                type="text"
                {...register("note")}
                placeholder="Optional note"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isSubmitting} variant="primary">
                Add
              </Button>
            </div>
          </div>
        </Card>
      </form>

      <ul className="space-y-4">
        {activities.map((a) => (
          <li
            key={a.id}
            className="flex items-start justify-between rounded-[var(--radius-lg)] border border-border bg-surface p-4"
          >
            <div className="flex gap-4">
              <div className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="font-medium capitalize text-foreground">{a.type}</p>
                <p className="text-sm text-muted">
                  {format(new Date(a.date), "PPp")}
                </p>
                {a.note && (
                  <p className="mt-1 text-sm text-secondary">{a.note}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(a.id)}
              className="text-sm text-error transition-colors duration-150 hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
