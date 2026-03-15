import { NextRequest, NextResponse } from "next/server";
import { google, gmail_v1 } from "googleapis";
import { InferenceClient } from "@huggingface/inference";
import { prisma } from "@/lib/db";
import { requireUser, AuthError, destroySession } from "@/lib/session";

function extractEmailBody(payload: gmail_v1.Schema$MessagePart): string {
  const extractFromPart = (part: gmail_v1.Schema$MessagePart): string => {
    let text = "";
    if (part.body?.data) {
      try {
        const decoded = Buffer.from(part.body.data, "base64").toString("utf-8");
        if (part.mimeType?.includes("text/html")) {
          const clean = decoded
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, " ")
            .trim();
          text += clean + "\n";
        } else {
          text += decoded + "\n";
        }
      } catch {
        // ignore
      }
    }
    if (part.parts) {
      for (const p of part.parts) text += extractFromPart(p);
    }
    return text;
  };
  return extractFromPart(payload).trim();
}

const JUNK_COMPANY = new Set([
  "e-mails", "all times", "the web", "alumni", "view", "access", "monthly", "estatement",
  "pool", "home", "any time", "anticipation", "was and much more", "pixel", "the",
  "your job alert", "job alert", "apply with resume", "is actively hiring",
  "new full-time", "seven oaks", "meredith surt",
]);
function isJunkCompany(s: string): boolean {
  const lower = s.toLowerCase().trim();
  if (/^\d+$/.test(lower) || lower.length < 2) return true;
  if (JUNK_COMPANY.has(lower)) return true;
  for (const j of JUNK_COMPANY) if (lower.includes(j)) return true;
  return false;
}

function extractCompanyRoleFromText(subject: string, body: string): { company: string; role: string } {
  const text = `${subject} ${body}`.toLowerCase();
  let company = "Unknown Company";
  let role = "Unknown Role";

  // Prefer subject when it looks like "Company - Role" or "Role at Company"
  const subjectRoleMatch = subject.match(
    /(?:^|\s)(?:software\s+engineer|engineer|developer|manager|analyst|designer|design\s+lead|product\s+manager|data\s+scientist)(?:\s|$|,|\.)/i
  );
  if (subjectRoleMatch) {
    const r = subjectRoleMatch[0].trim().replace(/[,.]+$/, "");
    if (r.length >= 4) role = r;
  }
  const subjectCompanyMatch = subject.match(
    /(?:at|@|from)\s+([A-Za-z0-9][A-Za-z0-9\s&.-]{1,35}?)(?:\s+(?:invites|has|would|team|-)|\.|,|$)/i
  );
  if (subjectCompanyMatch?.[1]) {
    const c = subjectCompanyMatch[1].trim();
    if (!isJunkCompany(c)) company = c;
  }

  const companyPatterns = [
    /(?:at|from|@)\s+([A-Z][a-zA-Z0-9\s&.-]{2,40}?)(?:\s+(?:invites|has|would|team)|\.|,|$)/i,
    /(?:company|employer|organization)[:\s]+([A-Za-z0-9\s&.-]{2,40})/i,
    /([A-Z][a-zA-Z0-9\s&.-]{2,30})\s+(?:inc|llc|corp|ltd)/i,
  ];
  if (company === "Unknown Company") {
    for (const re of companyPatterns) {
      const m = text.match(re);
      if (m?.[1]) {
        const c = m[1].trim();
        if (!isJunkCompany(c)) {
          company = c;
          break;
        }
      }
    }
  }

  const rolePatterns = [
    /(?:position|role|title|applying for)[:\s]+([A-Za-z\s&-]{3,50})/i,
    /(?:as\s+)?(?:a\s+)?([A-Za-z\s&]+(?:engineer|developer|manager|analyst|designer|lead))(\s|,|\.|$)/i,
    /(?:job|opportunity)[:\s]+([A-Za-z0-9\s&-]{3,50})/i,
  ];
  if (role === "Unknown Role") {
    for (const re of rolePatterns) {
      const m = text.match(re);
      if (m?.[1]) {
        const r = m[1].trim();
        if (r.length >= 4 && !/^(e-mails|d designer|all|any|the)$/i.test(r)) role = r;
        break;
      }
    }
  }

  if (isJunkCompany(company)) company = "Unknown Company";
  return { company, role };
}

const STAGE_MAP: Record<string, string> = {
  "job application confirmation": "applied",
  "applied": "applied",
  "interview invitation": "interviewing",
  "interviewing": "interviewing",
  "job offer": "offer",
  "offer": "offer",
  "job rejection": "rejected",
  "rejected": "rejected",
};

const PROMO_PHRASES = [
  /unsubscribe/i,
  /click\s+here\s+to\s+unsubscribe/i,
  /manage\s+your\s+subscription/i,
  /job\s+alert/i,
  /your\s+job\s+alert\s+for/i,
  /new\s+jobs\s+matching/i,
  /you\s+have\s+\d+\s+new/i,
  /please\s+click\s+here\s+to\s+unsubscribe/i,
  /monster\.com/i,
  /talent\.com/i,
  /jobright/i,
  /indeed/i,
];

function shouldExcludeAsPromotional(text: string, from: string): boolean {
  const combined = `${from} ${text}`.toLowerCase();
  return PROMO_PHRASES.some((re) => re.test(combined));
}

const KEYWORD_STAGE_PATTERNS: { stage: string; patterns: RegExp[] }[] = [
  {
    stage: "rejected",
    patterns: [
      /unfortunately/i,
      /moving\s+forward\s+with\s+other\s+candidates/i,
      /not\s+considered/i,
      /we\s+will\s+not\s+be\s+moving\s+forward/i,
      /not\s+selected/i,
      /other\s+candidates/i,
    ],
  },
  {
    stage: "offer",
    patterns: [
      /happy\s+to\s+offer/i,
      /pleased\s+to\s+offer/i,
      /we\s+are\s+pleased\s+to\s+extend/i,
      /offer\s+of\s+employment/i,
      /extend\s+an\s+offer/i,
    ],
  },
  {
    stage: "interviewing",
    patterns: [
      /invite\s+to\s+interview/i,
      /invitation\s+to\s+interview/i,
      /happy\s+to\s+move\s+forward/i,
      /moving\s+to\s+next\s+stage/i,
      /schedule\s+an\s+interview/i,
      /next\s+steps/i,
      /interview\s+schedule/i,
    ],
  },
  {
    stage: "applied",
    patterns: [
      /thank\s+you\s+for\s+applying/i,
      /we\s+received\s+your\s+application/i,
      /application\s+received/i,
      /submitted\s+your\s+application/i,
      /\bapplied\b/i,
      /\bapplying\b/i,
    ],
  },
];

function getStageFromKeywords(text: string): string | null {
  for (const { stage, patterns } of KEYWORD_STAGE_PATTERNS) {
    if (patterns.some((re) => re.test(text))) return stage;
  }
  return null;
}

const FROM_HEADER_SUFFIXES = [
  " job alert",
  " careers",
  " recruiting",
  " hiring",
  " notifications",
  " no-reply",
  " noreply",
];

function companyFromFromHeader(from: string): string | null {
  const match = from.match(/^([^<]+)</);
  const displayName = (match?.[1] ?? from).trim().replace(/^["']|["']$/g, "");
  if (!displayName || displayName.length < 2) {
    const domainMatch = from.match(/@([a-zA-Z0-9][a-zA-Z0-9.-]*)/);
    const domain = domainMatch?.[1] ?? "";
    const prefix = domain.split(".")[0];
    if (prefix && prefix.length >= 2) return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
    return null;
  }
  let name = displayName;
  const lower = name.toLowerCase();
  for (const suffix of FROM_HEADER_SUFFIXES) {
    if (lower.endsWith(suffix)) {
      name = name.slice(0, -suffix.length).trim();
      break;
    }
  }
  if (name.length >= 2 && !isJunkCompany(name)) return name;
  return null;
}

const HF_CONCURRENCY = 6;

async function runWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function isInsufficientScopesError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /insufficient.*scope|scope.*insufficient|403|access.*denied/i.test(msg);
}

const INSUFFICIENT_SCOPES_MESSAGE =
  "Gmail access was not fully granted. Add the Gmail scope in Google Cloud Console (APIs & Services → OAuth consent screen → Data access → Add or remove scopes → add Gmail Read-only), then go to https://myaccount.google.com/permissions and remove this app, then Disconnect and Connect Gmail again.";

function sendProgress(
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  stage: string,
  current: number,
  total: number
) {
  controller.enqueue(
    encoder.encode(
      `data: ${JSON.stringify({
        type: "progress",
        stage,
        current,
        total,
        percentage: total > 0 ? Math.round((current / total) * 100) : 0,
      })}\n\n`
    )
  );
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const user = await requireUser();
        const dbUser = await prisma.user.findUnique({
          where: { id: user.userId },
        });
        if (!dbUser) {
          await destroySession();
          throw new AuthError("Session invalid. Please log in again.");
        }
        const body = await request.json();
        const {
          startDate,
          endDate,
          excludedEmails = [],
          classificationThreshold = 0.35,
          stageConfidenceThreshold = 0.5,
          replaceExisting = false,
        } = body;

        const hfToken = process.env.HUGGINGFACE_API_KEY;
        if (!hfToken) {
          throw new Error("HUGGINGFACE_API_KEY not configured");
        }

        const requiredEnv = [
          "GOOGLE_CLIENT_ID",
          "GOOGLE_CLIENT_SECRET",
          "GOOGLE_REDIRECT_URI",
        ];
        for (const envVar of requiredEnv) {
          if (!process.env[envVar]) throw new Error(`${envVar} not configured`);
        }

        if (!startDate || !endDate) {
          throw new Error("Start and end date required");
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          throw new Error("Invalid date format");
        }
        if (start >= end) throw new Error("Start date must be before end date");

        let credential = await prisma.gmailCredential.findUnique({
          where: { userId: user.userId },
        });
        if (!credential) {
          throw new Error("Gmail authentication required. Connect Gmail first.");
        }

        const oauth2 = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        oauth2.setCredentials({
          access_token: credential.accessToken,
          refresh_token: credential.refreshToken ?? undefined,
        });

        const tokens = await oauth2.getAccessToken();
        if (!tokens.token) throw new Error("Failed to get Gmail access token");

        if (tokens.token && credential.accessToken !== tokens.token) {
          const newRefresh = (tokens as { refresh_token?: string }).refresh_token;
          await prisma.gmailCredential.update({
            where: { userId: user.userId },
            data: {
              accessToken: tokens.token,
              refreshToken: newRefresh ?? credential.refreshToken,
            },
          });
        }

        const gmail = google.gmail({ version: "v1", auth: oauth2 });

        try {
          await gmail.users.getProfile({ userId: "me" });
        } catch (scopeErr) {
          if (isInsufficientScopesError(scopeErr)) {
            throw new Error(INSUFFICIENT_SCOPES_MESSAGE);
          }
          throw scopeErr;
        }

        sendProgress(encoder, controller, "Fetching emails", 0, 100);
        const query = `after:${Math.floor(start.getTime() / 1000)} before:${Math.floor(end.getTime() / 1000)}`;
        const allMessages: gmail_v1.Schema$Message[] = [];
        let pageToken: string | undefined;

        do {
          const res = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 100,
            pageToken,
          });
          const msgs = res.data.messages || [];
          allMessages.push(...msgs);
          pageToken = res.data.nextPageToken || undefined;
          sendProgress(
            encoder,
            controller,
            `Fetching (${allMessages.length} found)`,
            5,
            100
          );
        } while (pageToken);

        const batchSize = 10;
        const detailedMessages: gmail_v1.Schema$Message[] = [];
        for (let i = 0; i < allMessages.length; i += batchSize) {
          const batch = allMessages.slice(i, i + batchSize);
          const responses = await Promise.all(
            batch.map((m) =>
              gmail.users.messages
                .get({ userId: "me", id: m.id!, format: "full" })
                .then((r) => r.data)
                .catch(() => null)
            )
          );
          detailedMessages.push(
            ...(responses.filter(Boolean) as gmail_v1.Schema$Message[])
          );
          await new Promise((r) => setTimeout(r, 100));
        }

        // One application per thread: keep only the latest message per thread
        const byThread = new Map<string, gmail_v1.Schema$Message>();
        for (const msg of detailedMessages) {
          const tid = msg.threadId ?? msg.id!;
          const existing = byThread.get(tid);
          const msgTime = Number.parseInt(msg.internalDate ?? "0", 10);
          const existingTime = existing ? Number.parseInt(existing.internalDate ?? "0", 10) : 0;
          if (!existing || msgTime >= existingTime) byThread.set(tid, msg);
        }
        let onePerThread = Array.from(byThread.values());
        // Only Primary and Updates; exclude Social and Promotions; include if no category
        const categoryGood = ["CATEGORY_PERSONAL", "CATEGORY_UPDATES"];
        const categoryBad = ["CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL"];
        onePerThread = onePerThread.filter((msg) => {
          const ids = msg.labelIds || [];
          const hasBad = categoryBad.some((c) => ids.includes(c));
          if (hasBad) return false;
          const hasGood = categoryGood.some((c) => ids.includes(c));
          if (hasGood) return true;
          return true;
        });

        sendProgress(encoder, controller, "Classifying emails", 20, 100);
        const hf = new InferenceClient(hfToken);
        const labels = [
          "job application confirmation",
          "interview invitation",
          "job offer",
          "job rejection",
          "unrelated or promotional",
        ];

        type EmailForProcessing = {
          id: string;
          subject: string;
          from: string;
          date: Date;
          body: string;
          text: string;
        };

        const emailsForProcessing: EmailForProcessing[] = [];

        for (const email of onePerThread) {
          const headers = email.payload?.headers || [];
          const from = headers.find((h) => h.name === "From")?.value || "";
          const subject = headers.find((h) => h.name === "Subject")?.value || "";
          const excluded = excludedEmails.some(
            (ex: string) =>
              from.toLowerCase().includes(ex.toLowerCase()) ||
              from === ex
          );
          if (excluded) continue;

          const date = new Date(Number.parseInt(email.internalDate ?? "0"));
          const body = email.payload ? extractEmailBody(email.payload) : "";
          const text = `Subject: ${subject}\n\n${body.substring(0, 800)}`;
          if (shouldExcludeAsPromotional(text, from)) continue;
          emailsForProcessing.push({
            id: email.id!,
            subject,
            from,
            date,
            body,
            text,
          });
        }

        type JobRelatedEmail = EmailForProcessing & { stage: string };
        const jobRelated: JobRelatedEmail[] = [];

        const classificationResults = await runWithConcurrency(
          emailsForProcessing,
          async (email, i) => {
            try {
              const result = await hf.zeroShotClassification({
                model: "facebook/bart-large-mnli",
                inputs: email.text,
                parameters: {
                  candidate_labels: labels,
                  multi_label: false,
                },
              });
              const top = Array.isArray(result) ? result[0] : result;
              const topItem = top as { label?: string; score?: number } | null;
              const label = (topItem?.label ?? "").toLowerCase();
              const score = topItem?.score ?? 0;

              if (
                label !== "unrelated or promotional" &&
                score >= classificationThreshold
              ) {
                let stage = "applied";
                if (score >= stageConfidenceThreshold && STAGE_MAP[label])
                  stage = STAGE_MAP[label];
                const keywordStage = getStageFromKeywords(email.text);
                if (keywordStage) stage = keywordStage;
                return { email, stage } as { email: EmailForProcessing; stage: string };
              }
            } catch (err) {
              console.warn("Classification failed for", email.id, err);
            }
            return null;
          },
          HF_CONCURRENCY
        );

        for (let i = 0; i < classificationResults.length; i++) {
          const r = classificationResults[i];
          if (r) jobRelated.push({ ...r.email, stage: r.stage });
          if (i % 5 === 0 || i === classificationResults.length - 1) {
            sendProgress(
              encoder,
              controller,
              `Classifying (${i + 1}/${emailsForProcessing.length})`,
              20 + Math.floor(((i + 1) / emailsForProcessing.length) * 40),
              100
            );
          }
        }

        sendProgress(
          encoder,
          controller,
          `Processing ${jobRelated.length} job emails`,
          65,
          100
        );

        const applications: Array<{
          company: string;
          role: string;
          stage: string;
          appliedAt: Date;
          sourceEmailId: string;
          description?: string;
          sourceEmailSubject?: string;
          sourceEmailSnippet?: string;
        }> = [];
        let existingIds = new Set(
          (
            await prisma.application.findMany({
              where: { userId: user.userId, sourceEmailId: { not: null } },
              select: { sourceEmailId: true },
            })
          )
            .map((a) => a.sourceEmailId)
            .filter(Boolean) as string[]
        );
        if (replaceExisting && jobRelated.length > 0) {
          const idsToReplace = jobRelated.map((e) => e.id);
          await prisma.application.deleteMany({
            where: { userId: user.userId, sourceEmailId: { in: idsToReplace } },
          });
          existingIds = new Set(
            (
              await prisma.application.findMany({
                where: { userId: user.userId, sourceEmailId: { not: null } },
                select: { sourceEmailId: true },
              })
            )
              .map((a) => a.sourceEmailId)
              .filter(Boolean) as string[]
          );
        }

        for (let i = 0; i < jobRelated.length; i++) {
          const email = jobRelated[i];
          if (existingIds.has(email.id)) continue;

          let { company, role } = extractCompanyRoleFromText(
            email.subject,
            email.body
          );
          if (company === "Unknown Company") {
            const fromCompany = companyFromFromHeader(email.from);
            if (fromCompany) company = fromCompany;
          }
          applications.push({
            company,
            role,
            stage: email.stage,
            appliedAt: email.date,
            sourceEmailId: email.id,
            description: `Imported from Gmail. From: ${email.from}`.substring(
              0,
              500
            ),
            sourceEmailSubject: email.subject,
            sourceEmailSnippet: email.body.substring(0, 600).trim(),
          });

          sendProgress(
            encoder,
            controller,
            `Extracting (${i + 1}/${jobRelated.length})`,
            65 + Math.floor(((i + 1) / jobRelated.length) * 25),
            100
          );
        }

        let imported = 0;
        for (const app of applications) {
          try {
            const created = await prisma.application.create({
              data: {
                userId: user.userId,
                company: app.company,
                role: app.role,
                stage: app.stage,
                appliedAt: app.appliedAt,
                sourceEmailId: app.sourceEmailId,
                description: app.description ?? null,
                sourceEmailSubject: app.sourceEmailSubject ?? null,
                sourceEmailSnippet: app.sourceEmailSnippet ?? null,
              },
            });
            await prisma.activity.create({
              data: {
                applicationId: created.id,
                type: app.stage === "applied" ? "applied" : "interview",
                date: app.appliedAt,
                note: "Imported from Gmail",
              },
            }).catch(() => {});
            imported++;
          } catch (err) {
            console.warn("Failed to create app", app.sourceEmailId, err);
          }
        }

        sendProgress(encoder, controller, "Complete", 100, 100);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              success: true,
              imported,
              total: jobRelated.length,
              totalEmails: allMessages.length,
            })}\n\n`
          )
        );
        controller.close();
      } catch (err) {
        const message =
          err instanceof AuthError
            ? err.message
            : isInsufficientScopesError(err)
              ? INSUFFICIENT_SCOPES_MESSAGE
              : err instanceof Error
                ? err.message
                : "Failed to process emails";
        if (err instanceof AuthError) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message, status: 401 })}\n\n`
            )
          );
        } else {
          controller.enqueue(
          encoder.encode(
          `data: ${JSON.stringify({ type: "error", message })}\n\n`
            )
          );
        }
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
