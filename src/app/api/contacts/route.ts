import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireUser, AuthError } from "@/lib/session";

const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === null ? undefined : v)),
  role: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  linkedToApplicationId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");

    const userApplicationIds = (
      await prisma.application.findMany({
        where: { userId: user.userId },
        select: { id: true },
      })
    ).map((a) => a.id);

    if (applicationId && !userApplicationIds.includes(applicationId)) {
      return NextResponse.json([]);
    }

    const contacts = await prisma.contact.findMany({
      where: applicationId
        ? { linkedToApplicationId: applicationId }
        : { OR: [{ linkedToApplicationId: null }, { linkedToApplicationId: { in: userApplicationIds } }] },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(contacts);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to fetch contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const data = createContactSchema.parse(body);

    if (data.linkedToApplicationId) {
      const app = await prisma.application.findFirst({
        where: { id: data.linkedToApplicationId, userId: user.userId },
      });
      if (!app) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
    }

    const contact = await prisma.contact.create({
      data: {
        name: data.name,
        email: data.email || null,
        role: data.role || null,
        company: data.company || null,
        linkedToApplicationId: data.linkedToApplicationId || null,
      },
    });
    return NextResponse.json(contact);
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
    console.error("Failed to create contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
