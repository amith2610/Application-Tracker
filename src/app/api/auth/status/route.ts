import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({
        isLoggedIn: false,
        email: null,
        userId: null,
        gmailConnected: false,
      });
    }
    const gmail = await prisma.gmailCredential.findUnique({
      where: { userId: session.userId },
      select: { id: true },
    });
    return NextResponse.json({
      isLoggedIn: true,
      email: session.email,
      userId: session.userId,
      gmailConnected: !!gmail,
    });
  } catch {
    return NextResponse.json({
      isLoggedIn: false,
      email: null,
      userId: null,
      gmailConnected: false,
    });
  }
}
