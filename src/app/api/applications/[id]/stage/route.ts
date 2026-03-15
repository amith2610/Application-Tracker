import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireUser, AuthError } from "@/lib/session";

const stageSchema = z.object({
  stage: z.enum(["applied", "interviewing", "offer", "rejected"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const { stage } = stageSchema.parse(body);

    const existing = await prisma.application.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const application = await prisma.application.update({
      where: { id },
      data: { stage },
      include: {
        contacts: true,
        documents: true,
        activities: { orderBy: { date: "desc" } },
      },
    });

    return NextResponse.json(application);
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
    console.error("Failed to update stage:", error);
    return NextResponse.json(
      { error: "Failed to update stage" },
      { status: 500 }
    );
  }
}
