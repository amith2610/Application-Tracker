"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

function GmailImportContent() {
  const searchParams = useSearchParams();
  const [authStatus, setAuthStatus] = useState<{
    isLoggedIn: boolean;
    email: string | null;
    gmailConnected: boolean;
  }>({ isLoggedIn: false, email: null, gmailConnected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: "", percentage: 0 });
  const [result, setResult] = useState<{
    imported?: number;
    total?: number;
    totalEmails?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");
  const [dateRange, setDateRange] = useState({ startDate, endDate });
  const [replaceExisting, setReplaceExisting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then(setAuthStatus)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const err = searchParams.get("error");
    const success = searchParams.get("success");
    if (err) {
      setError(
        err === "not_logged_in"
          ? "You must be logged in to connect Gmail."
          : err === "no_code"
            ? "Authorization was cancelled or no code received."
            : err === "no_email"
              ? "Could not get your email from Google."
              : "Authentication failed. Please try again."
      );
    }
    if (success) {
      fetch("/api/auth/status").then((r) => r.json()).then(setAuthStatus);
    }
  }, [searchParams]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/gmail");
      const data = await res.json();
      if (res.status === 401) {
        setError("Please log in to connect Gmail.");
        return;
      }
      if (data.authUrl) window.location.href = data.authUrl;
      else setError(data.error ?? "Failed to get auth URL");
    } catch {
      setError("Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await fetch("/api/auth/gmail/disconnect", { method: "DELETE" });
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setAuthStatus({
        isLoggedIn: data.isLoggedIn ?? false,
        email: data.email ?? null,
        gmailConnected: data.gmailConnected ?? false,
      });
      setResult(null);
    } catch {
      setError("Failed to disconnect");
    }
  }

  async function handleImport() {
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress({ stage: "Starting...", percentage: 0 });

    try {
      const res = await fetch("/api/gmail/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          replaceExisting,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "progress") {
                setProgress({
                  stage: data.stage || "",
                  percentage: data.percentage || 0,
                });
              } else if (data.type === "complete") {
                setResult({
                  imported: data.imported,
                  total: data.total,
                  totalEmails: data.totalEmails,
                });
                setProgress({ stage: "Complete", percentage: 100 });
              } else if (data.type === "error") {
                throw new Error(data.message);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setResult(null);
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted">Loading...</div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-muted transition-colors duration-150 hover:text-foreground"
        >
          ← Back to Board
        </Link>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Import from Gmail
      </h1>
      <p className="mb-8 text-secondary">
        Connect your Gmail to scan for job-related emails. AI (Hugging Face)
        classifies and extracts applications, interviews, offers, and rejections.
      </p>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {!authStatus.gmailConnected ? (
        <Card className="p-6">
          <h2 className="mb-2 font-semibold text-foreground">
            Connect Gmail
          </h2>
          <p className="mb-4 text-sm text-secondary">
            Sign in with Google to grant read-only access to your inbox. Emails
            are processed locally and not stored on external servers. You must be
            added as a test user in Google Cloud to connect (contact the app owner).
          </p>
          <Button
            onClick={handleConnect}
            disabled={connecting}
            variant="primary"
          >
            {connecting ? "Connecting..." : "Connect Gmail"}
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Connected</p>
                <p className="text-sm text-muted">
                  {authStatus.email || "Gmail account connected"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-sm text-muted transition-colors duration-150 hover:text-foreground"
              >
                Disconnect
              </button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-foreground">
              Date Range
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-secondary">
                  From
                </label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  disabled={processing}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-secondary">
                  To
                </label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  disabled={processing}
                />
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                disabled={processing}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-secondary">
                Replace existing applications from this range (re-import with current rules)
              </span>
            </label>
            <Button
              onClick={handleImport}
              disabled={processing}
              variant="primary"
              className="mt-4"
            >
              {processing ? "Processing..." : "Scan & Import"}
            </Button>

            {processing && (
              <div className="mt-4">
                <p className="text-sm text-secondary">{progress.stage}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {result && (
              <Alert variant="success" className="mt-4">
                <p className="font-medium">Import complete</p>
                <p className="mt-1 text-sm">
                  Imported {result.imported} applications from {result.total}{" "}
                  job-related emails (scanned {result.totalEmails} total).
                </p>
                <Link
                  href="/"
                  className="mt-2 inline-block text-sm font-medium transition-colors duration-150 hover:underline"
                >
                  View on Board →
                </Link>
              </Alert>
            )}
          </Card>
        </div>
      )}

      <p className="mt-8 text-xs text-muted">
        Requires Google Cloud Gmail API + OAuth credentials and
        HUGGINGFACE_API_KEY. See .env.example.
      </p>
    </div>
  );
}

export default function GmailImportPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted">Loading...</div>}>
      <GmailImportContent />
    </Suspense>
  );
}
