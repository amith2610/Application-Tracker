import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";
import { requireUser, AuthError } from "@/lib/session";
import { getUploadsDir } from "@/lib/uploads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: { application: true },
    });

    if (!document || document.application?.userId !== user.userId) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const filePath = path.join(getUploadsDir(), document.path);
    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.filename)}"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to download document:", error);
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    );
  }
}
