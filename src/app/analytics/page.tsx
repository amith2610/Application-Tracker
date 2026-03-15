"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { STAGE_COLORS, CHART_GRID_STROKE, CHART_PRIMARY } from "@/lib/theme";

const STAGE_ORDER = ["applied", "interviewing", "offer", "rejected"] as const;
const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
};

type Analytics = {
  total: number;
  byStage: Record<string, number>;
  offers: number;
  rejections: number;
  inProgress: number;
  conversionRate: number;
  avgResponseDays: number | null;
  applicationsOverTime: { date: string; count: number }[];
  contactsCount?: number;
  documentsCount?: number;
};

function conversionPercent(from: number, to: number): string {
  if (from === 0) return "0%";
  return `${Math.round((to / from) * 100)}%`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center text-muted">Loading analytics...</div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted">
        Failed to load analytics
      </div>
    );
  }

  const pieData = Object.entries(data.byStage)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const funnelData = STAGE_ORDER.map((stage) => ({
    name: STAGE_LABELS[stage] ?? stage,
    stage,
    count: data.byStage[stage] ?? 0,
    fill: STAGE_COLORS[stage] ?? "#94a3b8",
  })).filter((d) => d.count > 0);

  const appliedCount = data.byStage.applied ?? 0;
  const interviewingCount = data.byStage.interviewing ?? 0;
  const offerCount = data.byStage.offer ?? 0;
  const rejectedCount = data.byStage.rejected ?? 0;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Board Metrics
      </h1>
      <p className="mb-8 text-sm text-muted">
        → {format(new Date(), "MMMM d, yyyy")}
      </p>

      {/* Job Search Funnel */}
      <Card className="mb-8 p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Job Search Funnel
        </h2>
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Applied
            </p>
            <p className="text-2xl font-bold text-foreground">{appliedCount}</p>
            <p className="text-xs text-muted">
              → Interviewing {conversionPercent(appliedCount, interviewingCount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Interviewing
            </p>
            <p className="text-2xl font-bold text-foreground">
              {interviewingCount}
            </p>
            <p className="text-xs text-muted">
              → Offer {conversionPercent(interviewingCount, offerCount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Offer
            </p>
            <p className="text-2xl font-bold text-success">{offerCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Rejected
            </p>
            <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
          </div>
        </div>
        {funnelData.length > 0 && (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={funnelData}
              layout="vertical"
              margin={{ top: 0, right: 24, left: 80, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={76}
                tick={{ fontSize: 12, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [value ?? 0, "Count"]}
                contentStyle={{
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {funnelData.map((entry) => (
                  <Cell key={entry.stage} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm font-medium text-muted">Total Applications</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{data.total}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-muted">Offers</p>
          <p className="mt-1 text-3xl font-bold text-success">{data.offers}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-muted">Contacts</p>
          <p className="mt-1 text-3xl font-bold text-foreground">
            {data.contactsCount ?? 0}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-muted">Documents</p>
          <p className="mt-1 text-3xl font-bold text-foreground">
            {data.documentsCount ?? 0}
          </p>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Applications by Stage
          </h2>
          {pieData.length === 0 ? (
            <p className="py-12 text-center text-muted">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={STAGE_COLORS[entry.name] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Applications Over Time (Last 30 Days)
          </h2>
          {data.applicationsOverTime.length === 0 ? (
            <p className="py-12 text-center text-muted">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.applicationsOverTime}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_GRID_STROKE}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                />
                <Tooltip
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }
                />
                <Bar
                  dataKey="count"
                  fill={CHART_PRIMARY}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
