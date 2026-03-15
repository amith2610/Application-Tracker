import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { cookies } from "next/headers";

export async function DELETE() {
  try {
    const user = await requireUser();
    await prisma.gmailCredential.deleteMany({
      where: { userId: user.userId },
    });
    const cookieStore = await cookies();
    cookieStore.delete("gmail_access_token");
    cookieStore.delete("gmail_refresh_token");
    cookieStore.delete("gmail_user_email");
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Disconnect Gmail error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
