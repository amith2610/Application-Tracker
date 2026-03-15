import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireUser, AuthError } from "@/lib/session";

const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  role: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  linkedToApplicationId: z.string().optional().nullable(),
});

async function contactBelongsToUser(contactId: string, userId: string): Promise<boolean> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: { application: true },
  });
  if (!contact) return false;
  if (!contact.linkedToApplicationId) return true;
  return contact.application?.userId === userId;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const belongs = await contactBelongsToUser(id, user.userId);
    if (!belongs) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }
    const contact = await prisma.contact.findUnique({ where: { id } });
    return NextResponse.json(contact);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to fetch contact:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
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
    if (!(await contactBelongsToUser(id, user.userId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    const body = await request.json();
    const data = updateContactSchema.parse(body);

    if (data.linkedToApplicationId !== undefined && data.linkedToApplicationId) {
      const app = await prisma.application.findFirst({
        where: { id: data.linkedToApplicationId, userId: user.userId },
      });
      if (!app) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.linkedToApplicationId !== undefined)
      updateData.linkedToApplicationId = data.linkedToApplicationId;

    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
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
    console.error("Failed to update contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
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
    if (!(await contactBelongsToUser(id, user.userId))) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    await prisma.contact.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to delete contact:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
