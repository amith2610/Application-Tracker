"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DocumentIcon, StarIcon, TrashIcon, SparklesIcon } from "@/components/ui/Icons";
import type { ResumeAnalysis, KeywordMatch } from "@/lib/aiResumeMatch";

const MAX_LENGTH = 8000;

type ApplicationOption = { id: string; company: string; role: string; description: string | null };

export default function ResumeMatchPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [applications, setApplications] = useState<ApplicationOption[]>([]);
  const [status, setStatus] = useState<"input" | "loading" | "results" | "error">("input");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResumeAnalysis | null>(null);
  const [ignoredKeywords, setIgnoredKeywords] = useState<Set<string>>(new Set());
  const [starredKeywords, setStarredKeywords] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.ok ? r.json() : [])
      .then((data: { id: string; company: string; role: string; description: string | null }[]) => {
        setApplications(Array.isArray(data) ? data : []);
      })
      .catch(() => setApplications([]));
  }, []);

  const selectedApp = applications.find((a) => a.id === applicationId);
  useEffect(() => {
    if (applicationId && selectedApp) {
      setJobDescription(selectedApp.description ?? "");
    }
  }, [applicationId, selectedApp]);

  function handleClearJob() {
    setJobDescription("");
    setApplicationId("");
  }

  function handleAnalyze() {
    const job = jobDescription.trim();
    const resume = resumeText.trim();
    if (!job || !resume) {
      setError("Please enter both job description and resume text.");
      return;
    }
    if (job.length > MAX_LENGTH || resume.length > MAX_LENGTH) {
      setError(`Each field must be at most ${MAX_LENGTH} characters.`);
      return;
    }
    setError(null);
    setStatus("loading");
    fetch("/api/ai/resume-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription: job,
        resumeText: resume,
        ...(applicationId ? { applicationId } : {}),
      }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error ?? "Analysis failed"); });
        return r.json();
      })
      .then((data: ResumeAnalysis) => {
        setResult(data);
        setIgnoredKeywords(new Set());
        setStarredKeywords(new Set());
        setStatus("results");
      })
      .catch((e) => {
        setError(e.message ?? "Analysis failed. Check input length and try again.");
        setStatus("error");
      });
  }

  function toggleIgnore(keyword: string) {
    setIgnoredKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  }

  function toggleStar(keyword: string) {
    setStarredKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  }

  const displayMatches = result?.matches.filter((m) => !ignoredKeywords.has(m.keyword)) ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">AI Resume Match</h1>

      {status === "input" && (
        <>
          <Card className="mb-6 p-6">
            <h2 className="mb-2 border-b-2 border-primary pb-2 text-lg font-semibold text-foreground">
              1. Job description
            </h2>
            <p className="mb-2 text-sm text-muted">
              Paste the full job description (roles, responsibilities, qualifications). Exclude company blurb or salary for better results. English only.
            </p>
            <div className="mb-2 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleClearJob} className="inline-flex items-center gap-2">
                <DocumentIcon className="size-4" />
                New job description
              </Button>
              <div className="flex items-center gap-2">
                <label htmlFor="app-select" className="text-sm text-muted">Associate with application:</label>
                <Select
                  id="app-select"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="min-w-[200px]"
                >
                  <option value="">— None —</option>
                  {applications.map((a) => (
                    <option key={a.id} value={a.id}>{a.company} — {a.role}</option>
                  ))}
                </Select>
              </div>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="mb-1 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={8}
              maxLength={MAX_LENGTH + 1}
            />
            <p className="text-xs text-muted">{jobDescription.length} / {MAX_LENGTH}</p>
          </Card>

          <Card className="mb-6 p-6">
            <h2 className="mb-2 border-b-2 border-primary pb-2 text-lg font-semibold text-foreground">
              2. Resume
            </h2>
            <p className="mb-2 text-sm text-muted">
              Paste your resume text (e.g. from Word or PDF). English only.
            </p>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here..."
              className="mb-1 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={10}
              maxLength={MAX_LENGTH + 1}
            />
            <p className="text-xs text-muted">{resumeText.length} / {MAX_LENGTH}</p>
          </Card>

          {error && (
            <div className="mb-4 rounded-[var(--radius-md)] border border-error bg-error-muted px-4 py-2 text-sm text-error">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={handleAnalyze}
              variant="primary"
              className="inline-flex items-center gap-2 px-6 py-3"
            >
              <SparklesIcon className="size-5" />
              Analyze
            </Button>
          </div>
        </>
      )}

      {status === "loading" && (
        <Card className="p-8 text-center">
          <p className="text-muted">Analyzing...</p>
          <p className="mt-2 text-sm text-muted">Understanding the job description and identifying skills.</p>
        </Card>
      )}

      {status === "error" && (
        <>
          <div className="mb-4 rounded-[var(--radius-md)] border border-error bg-error-muted px-4 py-2 text-sm text-error">
            {error}
          </div>
          <Button variant="secondary" onClick={() => setStatus("input")}>Try again</Button>
        </>
      )}

      {status === "results" && result && (
        <>
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Relevancy score</h2>
              <div className="flex flex-col items-center">
                <div
                  className="flex size-28 items-center justify-center rounded-full border-4 border-primary text-3xl font-bold text-primary"
                  style={{
                    borderColor: result.score >= 70 ? "var(--color-success)" : result.score >= 40 ? "var(--color-primary)" : "var(--color-warning)",
                  }}
                >
                  {result.score}
                </div>
                <p className="mt-2 text-sm text-muted">out of 100</p>
              </div>
              {result.summaryRecommendations.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-medium text-foreground">Suggestions</h3>
                  <ul className="list-inside list-disc space-y-1 text-sm text-secondary">
                    {result.summaryRecommendations.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-4 text-xs text-muted">
                AI suggestions are approximate; always tailor your resume manually.
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Keywords</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted">
                      <th className="pb-2 pr-2">Keyword</th>
                      <th className="pb-2 pr-2">Strength</th>
                      <th className="pb-2 w-8">Key</th>
                      <th className="pb-2 w-8">Hide</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayMatches.map((m) => (
                      <KeywordRow
                        key={m.keyword}
                        match={m}
                        isStarred={starredKeywords.has(m.keyword)}
                        onToggleStar={() => toggleStar(m.keyword)}
                        onToggleIgnore={() => toggleIgnore(m.keyword)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button variant="secondary" onClick={() => { setStatus("input"); setResult(null); }}>
              New analysis
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function KeywordRow({
  match,
  isStarred,
  onToggleStar,
  onToggleIgnore,
}: {
  match: KeywordMatch;
  isStarred: boolean;
  onToggleStar: () => void;
  onToggleIgnore: () => void;
}) {
  const strength = match.strength ?? "missing";
  const rowClass =
    strength === "strong" ? "text-success border-l-4 border-l-[var(--color-success)]" :
    strength === "medium" ? "text-foreground border-l-4 border-l-primary" :
    strength === "weak" ? "text-warning border-l-4 border-l-[var(--color-warning)]" :
    "text-muted border-l-4 border-l-[var(--color-error)]";

  return (
    <tr className={`border-b border-border-muted ${rowClass}`}>
      <td className="py-2 pr-2 font-medium">{match.keyword}</td>
      <td className="py-2 pr-2 capitalize">{strength}</td>
      <td className="py-2">
        <button
          type="button"
          onClick={onToggleStar}
          className="rounded p-1 text-primary hover:bg-primary-muted"
          aria-label={isStarred ? "Unmark key skill" : "Mark as key skill"}
        >
          <StarIcon className="size-4" filled={isStarred} />
        </button>
      </td>
      <td className="py-2">
        <button
          type="button"
          onClick={onToggleIgnore}
          className="rounded p-1 text-muted hover:bg-error-muted hover:text-error"
          aria-label="Hide keyword"
        >
          <TrashIcon className="size-4" />
        </button>
      </td>
    </tr>
  );
}
