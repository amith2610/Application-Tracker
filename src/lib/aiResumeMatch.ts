import { InferenceClient } from "@huggingface/inference";

const MAX_JOB_LENGTH = 8000;
const MAX_RESUME_LENGTH = 8000;

export type JobKeyword = {
  keyword: string;
  category?: string;
  importance: "high" | "medium" | "low";
};

export type KeywordMatch = {
  keyword: string;
  inResume: boolean;
  strength?: "strong" | "medium" | "weak" | "missing";
  notes?: string;
  importance?: string;
};

export type ResumeAnalysis = {
  score: number;
  jobKeywords: JobKeyword[];
  matches: KeywordMatch[];
  missingKeywords: string[];
  summaryRecommendations: string[];
};

type RawLLMOutput = {
  jobKeywords?: { keyword: string; category?: string; importance?: string }[];
  matches?: { keyword: string; inResume?: boolean; strength?: string; notes?: string; importance?: string }[];
  missingKeywords?: string[];
  overallScore?: number;
  summaryRecommendations?: string[];
};

const SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) resume analyst. Your task is to analyze a job description and a resume, then respond with ONLY a valid JSON object (no markdown, no code fences, no extra text).

Output schema (use exactly these keys):
{
  "jobKeywords": [{"keyword": "string", "category": "optional string", "importance": "high|medium|low"}],
  "matches": [{"keyword": "string", "inResume": true|false, "strength": "strong|medium|weak|missing", "notes": "optional string", "importance": "high|medium|low"}],
  "missingKeywords": ["string"],
  "overallScore": number between 0 and 100,
  "summaryRecommendations": ["short bullet string"]
}

Rules:
- Extract 10-25 key skills/requirements from the job description (technologies, soft skills, certifications). Set importance: "high" for must-haves, "medium" for important, "low" for nice-to-have.
- For each job keyword, set "inResume" true/false and "strength" (strong = clearly demonstrated, medium = mentioned, weak = tangential, missing = not in resume). Include every job keyword in "matches".
- Put keywords that are in the job but not in the resume in "missingKeywords".
- overallScore: 0-100 how well the resume matches the job (consider keyword coverage and importance).
- summaryRecommendations: 2-5 short actionable bullets (e.g. "Add experience with X", "Highlight Y certification").
Respond with only the JSON object.`;

function buildUserPrompt(jobDescription: string, resumeText: string): string {
  const jobSlice = jobDescription.slice(0, 6000);
  const resumeSlice = resumeText.slice(0, 6000);
  return `Job description:\n${jobSlice}\n\nResume text:\n${resumeSlice}`;
}

function extractJsonFromResponse(text: string): string {
  let s = text.trim();
  const codeBlock = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock?.[1]) s = codeBlock[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  return s;
}

function parseRawOutput(text: string): RawLLMOutput {
  const jsonStr = extractJsonFromResponse(text);
  try {
    return JSON.parse(jsonStr) as RawLLMOutput;
  } catch {
    return {};
  }
}

function normalizeImportance(s: unknown): "high" | "medium" | "low" {
  if (s === "high" || s === "medium" || s === "low") return s;
  const lower = String(s).toLowerCase();
  if (lower.includes("high")) return "high";
  if (lower.includes("low")) return "low";
  return "medium";
}

function normalizeStrength(s: unknown): "strong" | "medium" | "weak" | "missing" {
  if (s === "strong" || s === "medium" || s === "weak" || s === "missing") return s;
  const lower = String(s).toLowerCase();
  if (lower.includes("strong")) return "strong";
  if (lower.includes("weak")) return "weak";
  if (lower.includes("missing")) return "missing";
  return "medium";
}

function computeScoreFromMatches(
  jobKeywords: JobKeyword[],
  matches: KeywordMatch[]
): number {
  const weightMap = { high: 3, medium: 2, low: 1 } as const;
  const strengthMap = { strong: 1, medium: 0.7, weak: 0.4, missing: 0 } as const;
  let totalWeight = 0;
  let coveredWeight = 0;
  for (const jk of jobKeywords) {
    const w = weightMap[jk.importance] ?? 1;
    totalWeight += w;
    const m = matches.find((x) => x.keyword.toLowerCase() === jk.keyword.toLowerCase());
    const strength = m?.strength ?? "missing";
    coveredWeight += w * (strengthMap[strength] ?? 0);
  }
  if (totalWeight === 0) return 0;
  return Math.round((coveredWeight / totalWeight) * 100);
}

function toResumeAnalysis(raw: RawLLMOutput): ResumeAnalysis {
  const jobKeywords: JobKeyword[] = (raw.jobKeywords ?? []).map((k) => ({
    keyword: String(k.keyword ?? "").trim(),
    category: k.category ? String(k.category).trim() : undefined,
    importance: normalizeImportance(k.importance),
  })).filter((k) => k.keyword.length > 0);

  const matches: KeywordMatch[] = (raw.matches ?? []).map((m) => ({
    keyword: String(m.keyword ?? "").trim(),
    inResume: Boolean(m.inResume),
    strength: normalizeStrength(m.strength),
    notes: m.notes ? String(m.notes).trim() : undefined,
    importance: m.importance ? String(m.importance) : undefined,
  })).filter((m) => m.keyword.length > 0);

  const missingKeywords = (raw.missingKeywords ?? []).map((s) => String(s).trim()).filter(Boolean);
  const summaryRecommendations = (raw.summaryRecommendations ?? []).map((s) => String(s).trim()).filter(Boolean);

  let score = typeof raw.overallScore === "number" && raw.overallScore >= 0 && raw.overallScore <= 100
    ? Math.round(raw.overallScore)
    : computeScoreFromMatches(jobKeywords, matches);

  return {
    score,
    jobKeywords,
    matches,
    missingKeywords,
    summaryRecommendations,
  };
}

export async function analyzeJobAndResume(params: {
  jobDescription: string;
  resumeText: string;
}): Promise<ResumeAnalysis> {
  const { jobDescription, resumeText } = params;
  if (jobDescription.length > MAX_JOB_LENGTH || resumeText.length > MAX_RESUME_LENGTH) {
    throw new Error("Job description and resume must each be at most 8000 characters.");
  }
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) throw new Error("HUGGINGFACE_API_KEY is not configured.");

  const defaultModel = process.env.HF_RESUME_MODEL ?? "google/gemma-2-2b-it";
  const fallbackModel = process.env.HF_RESUME_FALLBACK_MODEL ?? "microsoft/DialoGPT-large";
  const legacyModel = process.env.HF_RESUME_LEGACY_MODEL ?? "google/flan-t5-large";
  const client = new InferenceClient(token);

  const userPrompt = buildUserPrompt(jobDescription, resumeText);
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}\n\nRespond with only the JSON object:`;

  type ProviderError = Error & { httpResponse?: { status?: number; body?: unknown } };

  async function runChat(modelId: string): Promise<ResumeAnalysis> {
    const response = await client.chatCompletion({
      model: modelId,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${userPrompt}\n\nRespond with only the JSON object:` },
      ],
      max_tokens: 2048,
      temperature: 0.2,
    });

    const content =
      (response as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("Empty response from AI.");

    const raw = parseRawOutput(content);
    return toResumeAnalysis(raw);
  }

  /** Fallback via router (router.huggingface.co) when provider chat returns model_not_supported. */
  async function runLegacyTextGen(): Promise<ResumeAnalysis> {
    const url = "https://router.huggingface.co/v1/chat/completions";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: legacyModel,
        messages: [{ role: "user", content: fullPrompt.slice(0, 4000) }],
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      let errBody: unknown = text;
      try {
        errBody = JSON.parse(text);
      } catch {
        // keep text
      }
      const e = new Error() as ProviderError;
      e.httpResponse = { status: res.status, body: errBody };
      throw e;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from router.");
    const raw = parseRawOutput(content);
    return toResumeAnalysis(raw);
  }

  function toUserMessage(err: ProviderError): string {
    const status = err.httpResponse?.status;
    const body = err.httpResponse?.body;
    const bodyObj = typeof body === "object" && body !== null ? body as { error?: { code?: string } } : {};
    if (status === 400 && bodyObj?.error?.code === "model_not_supported") {
      return "The selected model is not enabled for your Hugging Face account. Add HF_RESUME_MODEL to .env with a model you have enabled (e.g. at huggingface.co/inference or in your provider settings).";
    }
    let detail = "";
    if (body !== undefined && body !== null) {
      const str = typeof body === "string" ? body : JSON.stringify(body);
      detail = str.length > 400 ? str.slice(0, 400) + "…" : str;
    }
    if (status !== undefined) {
      if (status === 401) return "Invalid or missing Hugging Face API key. Check HUGGINGFACE_API_KEY in .env.";
      if (status === 403) return "Access denied (403). Check your Hugging Face API key and model access.";
      if (status === 410) return "The previous inference endpoint is no longer supported. The app now uses the Hugging Face router; try again.";
      if (status === 503) return "Model is loading or overloaded (503). Try again in a moment or set HF_RESUME_MODEL to another model.";
      return `Provider error (HTTP ${status})${detail ? ": " + detail : ""}`;
    }
    return err.message || "Analysis failed. Check input length and try again.";
  }

  try {
    return await runChat(defaultModel);
  } catch (err) {
    const providerErr = err as ProviderError;
    const status = providerErr.httpResponse?.status;
    const body = providerErr.httpResponse?.body as { error?: { code?: string } } | undefined;
    const isModelNotSupported = status === 400 && body?.error?.code === "model_not_supported";

    if (status === 503 && defaultModel !== fallbackModel) {
      try {
        return await runChat(fallbackModel);
      } catch (fallbackErr) {
        throw new Error(toUserMessage(fallbackErr as ProviderError));
      }
    }

    if (isModelNotSupported) {
      try {
        return await runLegacyTextGen();
      } catch (legacyErr) {
        throw new Error(toUserMessage(legacyErr as ProviderError));
      }
    }

    throw new Error(toUserMessage(providerErr));
  }
}
