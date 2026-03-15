"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ShareButtonProps = {
  type: "board" | "application";
  applicationId?: string;
  label?: string;
};

export function ShareButton({
  type,
  applicationId,
  label = "Share",
}: ShareButtonProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          referenceId: type === "application" ? applicationId : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      setUrl(data.url);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (url) {
    return (
      <div className="flex items-center gap-2">
        <Input
          readOnly
          value={url}
          className="w-72"
        />
        <Button
          variant="primary"
          onClick={copyToClipboard}
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
        <button
          type="button"
          onClick={() => setUrl(null)}
          className="text-sm text-muted transition-colors duration-150 hover:text-foreground"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <Button
      variant="secondary"
      onClick={handleShare}
      disabled={loading}
    >
      {loading ? "Generating..." : label}
    </Button>
  );
}
