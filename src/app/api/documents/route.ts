import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    const userAppIds = (
      await prisma.application.findMany({
        where: { userId: user.userId },
        select: { id: true },
      })
    ).map((a) => a.id);

    if (applicationId && !userAppIds.includes(applicationId)) {
      return NextResponse.json([]);
    }

    const documents = await prisma.document.findMany({
      where: applicationId
        ? { applicationId }
        : { applicationId: { in: userAppIds } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(documents);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to fetch documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
