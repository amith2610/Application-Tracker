import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { analyzeJobAndResume } from "@/lib/aiResumeMatch";
import { requireUser, AuthError } from "@/lib/session";

const MAX_LENGTH = 8000;

const resumeMatchSchema = z.object({
  jobDescription: z.string().min(1, "Job description is required").max(MAX_LENGTH, `Job description must be at most ${MAX_LENGTH} characters`),
  resumeText: z.string().min(1, "Resume text is required").max(MAX_LENGTH, `Resume must be at most ${MAX_LENGTH} characters`),
  applicationId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = resumeMatchSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message = first.jobDescription?.[0] ?? first.resumeText?.[0] ?? "Invalid request.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { jobDescription, resumeText, applicationId } = parsed.data;

    if (applicationId) {
      const app = await prisma.application.findFirst({
        where: { id: applicationId, userId: user.userId },
        select: { id: true },
      });
      if (!app) {
        return NextResponse.json(
          { error: "Application not found." },
          { status: 404 }
        );
      }
    }

    const analysis = await analyzeJobAndResume({ jobDescription, resumeText });
    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Analysis failed. Check input length and try again.";
    console.error("Resume match error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
