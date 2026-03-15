import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const share = await prisma.share.findUnique({
      where: { token },
    });

    if (!share) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 }
      );
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Share link has expired" },
        { status: 410 }
      );
    }

    if (share.type === "board") {
      const applications = await prisma.application.findMany({
        where: share.userId ? { userId: share.userId } : undefined,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          company: true,
          role: true,
          stage: true,
          salary: true,
          appliedAt: true,
        },
      });
      return NextResponse.json({
        type: "board",
        applications,
        createdAt: share.createdAt,
      });
    }

    if (share.type === "application" && share.referenceId) {
      const application = await prisma.application.findFirst({
        where: {
          id: share.referenceId,
          ...(share.userId ? { userId: share.userId } : {}),
        },
        include: {
          contacts: true,
          activities: { orderBy: { date: "desc" } },
        },
      });
      if (!application) {
        return NextResponse.json(
          { error: "Application not found" },
          { status: 404 }
        );
      }
      // Don't include document paths for security
      const documents = await prisma.document.findMany({
        where: { applicationId: application.id },
        select: { id: true, filename: true, type: true },
      });
      return NextResponse.json({
        type: "application",
        application: {
          ...application,
          documents,
        },
        createdAt: share.createdAt,
      });
    }

    return NextResponse.json(
      { error: "Invalid share" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to fetch share:", error);
    return NextResponse.json(
      { error: "Failed to fetch share" },
      { status: 500 }
    );
  }
}
