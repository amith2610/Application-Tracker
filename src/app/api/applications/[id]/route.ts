import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireUser, AuthError } from "@/lib/session";

const updateApplicationSchema = z.object({
  company: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  salary: z.string().optional().nullable(),
  stage: z.enum(["applied", "interviewing", "offer", "rejected"]).optional(),
  description: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  appliedAt: z.string().datetime().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const application = await prisma.application.findFirst({
      where: { id, userId: user.userId },
      include: {
        contacts: true,
        documents: true,
        activities: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(application);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to fetch application:", error);
    return NextResponse.json(
      { error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();
    const data = updateApplicationSchema.parse(body);

    const existing = await prisma.application.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.company !== undefined) updateData.company = data.company;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.salary !== undefined) updateData.salary = data.salary;
    if (data.stage !== undefined) updateData.stage = data.stage;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.url !== undefined) updateData.url = data.url || null;
    if (data.appliedAt !== undefined)
      updateData.appliedAt = data.appliedAt ? new Date(data.appliedAt) : null;

    const application = await prisma.application.update({
      where: { id },
      data: updateData,
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
    console.error("Failed to update application:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await prisma.application.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    await prisma.application.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to delete application:", error);
    return NextResponse.json(
      { error: "Failed to delete application" },
      { status: 500 }
    );
  }
}
