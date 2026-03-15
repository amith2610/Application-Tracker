import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";
import { sendNewUserNotification } from "@/lib/email";

const signupSchema = z.object({
  email: z.string().email("Invalid email").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.email?.[0]
        ?? parsed.error.flatten().fieldErrors.password?.[0]
        ?? "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    await sendNewUserNotification(email).catch((err) => {
      console.error("Failed to send new user notification:", err);
    });

    await setSession({ userId: user.id, email: user.email });
    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: "Signup failed. Please try again." },
      { status: 500 }
    );
  }
}
