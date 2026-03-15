import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireUser, AuthError } from "@/lib/session";

const updateActivitySchema = z.object({
  type: z.enum(["applied", "interview", "offer", "rejection"]).optional(),
  date: z.string().datetime().optional(),
  note: z.string().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const user = await requireUser();
    const { activityId } = await params;
    const existing = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { application: true },
    });
    if (!existing || existing.application?.userId !== user.userId) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }
    const body = await request.json();
    const data = updateActivitySchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.type !== undefined) updateData.type = data.type;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.note !== undefined) updateData.note = data.note;

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: updateData,
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
    console.error("Failed to update activity:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const user = await requireUser();
    const { activityId } = await params;
    const existing = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { application: true },
    });
    if (!existing || existing.application?.userId !== user.userId) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }
    await prisma.activity.delete({
      where: { id: activityId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to delete activity:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}
