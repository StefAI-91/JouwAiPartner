"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExtractionCard } from "@/components/shared/extraction-card";
import { ReviewActionBar } from "@/components/shared/review-action-bar";
import { Mail, Clock, Building2, FolderKanban, Paperclip } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import { approveEmailWithEditsAction, rejectEmailAction } from "@/features/emails/actions";

interface EmailExtraction {
  id: string;
  type: string;
  content: string;
  confidence: number | null;
  source_ref: string | null;
  metadata: Record<string, unknown>;
}

interface EmailReviewDetailProps {
  email: {
    id: string;
    subject: string | null;
    from_address: string;
    from_name: string | null;
    to_addresses: string[];
    cc_addresses: string[];
    date: string;
    body_text: string | null;
    snippet: string | null;
    has_attachments: boolean;
    organization: { id: string; name: string } | null;
    projects: { id: string; name: string; source: string }[];
    extractions: EmailExtraction[];
  };
}

export function EmailReviewDetail({ email }: EmailReviewDetailProps) {
  const router = useRouter();
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  function handleEdit(id: string, content: string) {
    setEdits((prev) => new Map(prev).set(id, content));
  }

  function handleDelete(id: string) {
    setDeletedIds((prev) => new Set(prev).add(id));
  }

  async function handleApprove() {
    setLoading("approve");
    setError(null);

    const extractionEdits = [...edits.entries()].map(([id, content]) => ({
      extractionId: id,
      content,
    }));

    const result = await approveEmailWithEditsAction({
      emailId: email.id,
      extractionEdits: extractionEdits.length > 0 ? extractionEdits : undefined,
      rejectedExtractionIds: deletedIds.size > 0 ? [...deletedIds] : undefined,
    });

    if ("error" in result) {
      setError(result.error);
      setLoading(null);
    } else {
      router.push("/review");
    }
  }

  async function handleReject(reason: string) {
    setLoading("reject");
    setError(null);

    const result = await rejectEmailAction({ emailId: email.id, reason });

    if ("error" in result) {
      setError(result.error);
      setLoading(null);
    } else {
      router.push("/review");
    }
  }

  const visibleExtractions = email.extractions.filter((e) => !deletedIds.has(e.id));

  return (
    <div className="space-y-6 pb-28">
      {/* Email header */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>Email Review</span>
        </div>

        <h1 className="mt-3 text-lg font-semibold">{email.subject ?? "(geen onderwerp)"}</h1>

        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p>
            Van:{" "}
            <span className="font-medium text-foreground">
              {email.from_name ?? email.from_address}
            </span>
            {email.from_name && <span className="ml-1">({email.from_address})</span>}
          </p>
          <p>Aan: {email.to_addresses.join(", ")}</p>
          {email.cc_addresses.length > 0 && <p>CC: {email.cc_addresses.join(", ")}</p>}
          <p className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Date(email.date).toLocaleString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {email.organization && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {email.organization.name}
            </Badge>
          )}
          {email.projects.map((p) => (
            <Badge key={p.id} variant="outline" className="flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />
              {p.name}
            </Badge>
          ))}
          {email.has_attachments && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              Bijlagen
            </Badge>
          )}
        </div>
      </div>

      {/* Email body */}
      {email.body_text && (
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Email inhoud
          </h2>
          <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm">
            {email.body_text}
          </div>
        </div>
      )}

      {/* Extractions */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          AI Extracties ({visibleExtractions.length})
        </h2>

        {visibleExtractions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Alle extracties zijn verwijderd.
          </p>
        ) : (
          <div className="space-y-3">
            {visibleExtractions.map((extraction) => (
              <ExtractionCard
                key={extraction.id}
                extraction={{
                  id: extraction.id,
                  type: extraction.type,
                  content: extraction.content,
                  confidence: extraction.confidence,
                  transcript_ref: extraction.source_ref,
                }}
                onEdit={(id, content) => handleEdit(id, content)}
                onDelete={(id) => handleDelete(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <ReviewActionBar
        totalExtractions={email.extractions.length}
        deletedCount={deletedIds.size}
        editCount={edits.size}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={loading}
        error={error}
      />
    </div>
  );
}
