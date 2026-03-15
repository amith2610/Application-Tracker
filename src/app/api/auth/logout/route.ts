import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/session";

export async function POST() {
  try {
    await destroySession();
    const cookieStore = await cookies();
    cookieStore.delete("gmail_access_token");
    cookieStore.delete("gmail_refresh_token");
    cookieStore.delete("gmail_user_email");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}
