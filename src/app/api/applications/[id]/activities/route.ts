import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireUser, AuthError } from "@/lib/session";

const createActivitySchema = z.object({
  type: z.enum(["applied", "interview", "offer", "rejection"]),
  date: z.string().datetime(),
  note: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activities = await prisma.activity.findMany({
      where: { applicationId: id },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(activities);
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const application = await prisma.application.findFirst({
      where: { id, userId: user.userId },
    });
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    const body = await request.json();
    const data = createActivitySchema.parse(body);

    const activity = await prisma.activity.create({
      data: {
        applicationId: id,
        type: data.type,
        date: new Date(data.date),
        note: data.note ?? null,
      },
    });
    return NextResponse.json(activity);
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
    console.error("Failed to create activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
