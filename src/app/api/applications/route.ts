import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireUser, AuthError } from "@/lib/session";

const createApplicationSchema = z.object({
  company: z.string().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
  salary: z.string().optional(),
  stage: z.enum(["applied", "interviewing", "offer", "rejected"]).optional(),
  description: z.string().optional(),
  url: z.string().optional(),
  appliedAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const applications = await prisma.application.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: "desc" },
      include: {
        contacts: true,
        documents: true,
        activities: {
          orderBy: { date: "desc" },
        },
      },
    });
    return NextResponse.json(applications);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to fetch applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const data = createApplicationSchema.parse(body);

    const application = await prisma.application.create({
      data: {
        userId: user.userId,
        company: data.company,
        role: data.role,
        salary: data.salary ?? null,
        stage: data.stage ?? "applied",
        description: data.description ?? null,
        url: data.url || null,
        appliedAt: data.appliedAt ? new Date(data.appliedAt) : new Date(),
      },
      include: {
        contacts: true,
        documents: true,
        activities: true,
      },
    });

    // Create initial "applied" activity
    await prisma.activity.create({
      data: {
        applicationId: application.id,
        type: "applied",
        date: application.appliedAt ?? new Date(),
        note: "Application submitted",
      },
    });

    const withActivities = await prisma.application.findUnique({
      where: { id: application.id },
      include: {
        contacts: true,
        documents: true,
        activities: { orderBy: { date: "desc" } },
      },
    });

    return NextResponse.json(withActivities);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Failed to create application:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}
