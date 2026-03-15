import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "onboarding@resend.dev"; // Resend default for free tier

export async function sendNewUserNotification(userEmail: string): Promise<{ ok: boolean; error?: string }> {
  if (!ADMIN_EMAIL) {
    console.warn("ADMIN_EMAIL not set; skipping new user notification email.");
    return { ok: true };
  }
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping new user notification email.");
    return { ok: true };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: "Job Tracker: new user signup",
      html: `
        <p>A new user signed up: <strong>${escapeHtml(userEmail)}</strong>.</p>
        <p>Add this email to your Google Cloud OAuth consent screen test users so they can connect Gmail.</p>
        <p><a href="https://console.cloud.google.com/apis/credentials/consent">Google Cloud Console – OAuth consent screen</a></p>
      `,
    });
    if (error) {
      console.error("New user notification email failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("New user notification email error:", message);
    return { ok: false, error: message };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
