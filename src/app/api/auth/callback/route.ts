import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.clone();
  baseUrl.pathname = "/gmail-import";
  baseUrl.search = "";

  try {
    const session = await getSession();
    if (!session) {
      baseUrl.searchParams.set("error", "not_logged_in");
      return NextResponse.redirect(baseUrl.toString());
    }

    const code = request.nextUrl.searchParams.get("code");

    if (!code) {
      baseUrl.searchParams.set("error", "no_code");
      return NextResponse.redirect(baseUrl.toString());
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const tokenPromise = oauth2Client.getToken(code);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Token exchange timed out")), 15000)
    );
    const { tokens } = await Promise.race([tokenPromise, timeoutPromise]);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email) {
      baseUrl.searchParams.set("error", "no_email");
      return NextResponse.redirect(baseUrl.toString());
    }

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await prisma.gmailCredential.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token ?? null,
        email: userInfo.email,
        expiresAt,
      },
      update: {
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token ?? null,
        email: userInfo.email,
        expiresAt,
      },
    });

    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    cookieStore.set("gmail_access_token", tokens.access_token || "", {
      ...cookieOptions,
      maxAge: 3600, // 1 hour
    });

    if (tokens.refresh_token) {
      cookieStore.set("gmail_refresh_token", tokens.refresh_token, {
        ...cookieOptions,
        maxAge: 30 * 24 * 3600, // 30 days
      });
    }

    cookieStore.set("gmail_user_email", userInfo.email, {
      ...cookieOptions,
      maxAge: 30 * 24 * 3600,
    });

    baseUrl.searchParams.set("success", "1");
    return NextResponse.redirect(baseUrl.toString());
  } catch (error) {
    console.error("OAuth callback error:", error);
    const msg = error instanceof Error ? error.message : "callback_failed";
    baseUrl.searchParams.set("error", msg.includes("timeout") ? "timeout" : "callback_failed");
    return NextResponse.redirect(baseUrl.toString());
  }
}
