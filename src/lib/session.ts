import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "job_tracker_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export type SessionData = {
  userId: string;
  email: string;
};

function getPassword(): string {
  const p = process.env.SESSION_PASSWORD;
  if (!p || p.length < 32) {
    throw new Error(
      "SESSION_PASSWORD must be set in .env and at least 32 characters"
    );
  }
  return p;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const encrypted = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!encrypted) return null;
  try {
    const data = await unsealData<SessionData>(encrypted, {
      password: getPassword(),
      ttl: SESSION_MAX_AGE,
    });
    return data ?? null;
  } catch {
    return null;
  }
}

export async function setSession(data: SessionData): Promise<void> {
  const encrypted = await sealData(data, {
    password: getPassword(),
    ttl: SESSION_MAX_AGE,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/** Returns session or null. For APIs that require auth, use requireUser() instead. */
export async function requireUser(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Not authenticated");
  }
  return session;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

