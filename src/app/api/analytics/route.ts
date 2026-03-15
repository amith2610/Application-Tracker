import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireUser();
    const applications = await prisma.application.findMany({
      where: { userId: user.userId },
      include: {
        activities: true,
      },
    });

    const stages = ["applied", "interviewing", "offer", "rejected"] as const;
    const byStage = stages.reduce(
      (acc, stage) => {
        acc[stage] = applications.filter((a) => a.stage === stage).length;
        return acc;
      },
      {} as Record<string, number>
    );

    const total = applications.length;
    const offers = byStage.offer;
    const rejections = byStage.rejected;
    const inProgress = byStage.applied + byStage.interviewing;

    // Applications over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentApps = applications.filter(
      (a) => a.createdAt && new Date(a.createdAt) >= thirtyDaysAgo
    );

    const byDate = recentApps.reduce(
      (acc, app) => {
        const d = new Date(app.createdAt).toISOString().split("T")[0];
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const applicationsOverTime = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Response time: applied -> first interview (simplified)
    const withInterview = applications.filter((a) =>
      a.activities.some((act) => act.type === "interview")
    );
    const responseTimes = withInterview
      .map((a) => {
        const applied = a.activities.find((act) => act.type === "applied");
        const firstInterview = a.activities.find((act) => act.type === "interview");
        if (!applied || !firstInterview) return null;
        const diff =
          new Date(firstInterview.date).getTime() -
          new Date(applied.date).getTime();
        return Math.round(diff / (1000 * 60 * 60 * 24)); // days
      })
      .filter((d): d is number => d !== null);

    const avgResponseDays =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((s, d) => s + d, 0) / responseTimes.length
          )
        : null;

    const conversionRate =
      total > 0 ? Math.round((offers / total) * 100) : 0;

    const userAppIds = applications.map((a) => a.id);
    const [contactsCount, documentsCount] = await Promise.all([
      prisma.contact.count({
        where: {
          OR: [
            { linkedToApplicationId: null },
            { linkedToApplicationId: { in: userAppIds } },
          ],
        },
      }),
      prisma.document.count({
        where: { applicationId: { in: userAppIds } },
      }),
    ]);

    return NextResponse.json({
      total,
      byStage,
      offers,
      rejections,
      inProgress,
      conversionRate,
      avgResponseDays,
      applicationsOverTime,
      contactsCount,
      documentsCount,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
