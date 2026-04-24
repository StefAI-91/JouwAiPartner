"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { ExtractionDots } from "@/components/shared/extraction-dots";
import { approveEmailAction } from "@/actions/email";
import { useState } from "react";
import { timeAgo } from "@repo/ui/format";

interface EmailReviewCardProps {
  email: {
    id: string;
    subject: string | null;
    from_address: string;
    from_name: string | null;
    date: string;
    created_at: string;
    organization: { name: string } | null;
    extractions: { id: string; type: string; content: string; confidence: number | null }[];
  };
}

export function EmailReviewCard({ email }: EmailReviewCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove(e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await approveEmailAction({ emailId: email.id });
    if ("error" in result) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Top row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground/70">Email</span>
          {email.organization && <span>{email.organization.name}</span>}
        </div>
        <span>{timeAgo(email.date ?? email.created_at)}</span>
      </div>

      {/* Subject */}
      <h3 className="mt-3 font-heading text-lg font-semibold leading-snug">
        {email.subject ?? "(geen onderwerp)"}
      </h3>

      {/* From */}
      <p className="mt-1 text-sm text-muted-foreground">{email.from_name ?? email.from_address}</p>

      {/* Extraction dots */}
      <div className="mt-4">
        <ExtractionDots extractions={email.extractions} />
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex items-center justify-end gap-2">
        <Link
          href={`/review/email/${email.id}`}
          className="rounded-full border-2 border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-primary hover:text-primary"
        >
          Review
        </Link>
        <button
          onClick={handleApprove}
          disabled={loading}
          className="rounded-full bg-gradient-to-b from-brand to-brand-dark px-5 py-2 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {loading ? "Approving..." : "Approve"}
        </button>
      </div>
    </div>
  );
}
