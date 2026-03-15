import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireUser, AuthError } from "@/lib/session";

const createShareSchema = z.object({
  type: z.enum(["board", "application"]),
  referenceId: z.string().optional().nullable(),
  expiresInDays: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const data = createShareSchema.parse(body);

    if (data.type === "application" && data.referenceId) {
      const app = await prisma.application.findFirst({
        where: { id: data.referenceId, userId: user.userId },
      });
      if (!app) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
    }

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const token = nanoid(12);

    const share = await prisma.share.create({
      data: {
        token,
        type: data.type,
        referenceId: data.referenceId ?? null,
        userId: user.userId,
        expiresAt,
      },
    });

    return NextResponse.json({
      token: share.token,
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/share/${share.token}`,
      expiresAt: share.expiresAt?.toISOString() ?? null,
    });
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
    console.error("Failed to create share:", error);
    return NextResponse.json(
      { error: "Failed to create share" },
      { status: 500 }
    );
  }
}
