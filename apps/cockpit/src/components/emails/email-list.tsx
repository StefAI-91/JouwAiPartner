"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Building2, FolderKanban, Paperclip, ChevronRight, X } from "lucide-react";
import { Badge } from "@repo/ui/badge";
import type { EmailListItem } from "@repo/database/queries/emails";

interface EmailListProps {
  emails: EmailListItem[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  if (isYesterday) return "Gisteren";
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function relevanceBadge(score: number | null) {
  if (score === null) return null;
  if (score >= 0.8) return <Badge className="bg-green-100 text-green-700 text-[10px]">Hoog</Badge>;
  if (score >= 0.5)
    return <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Medium</Badge>;
  return null;
}

export function EmailList({ emails }: EmailListProps) {
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!statusFilter) return emails;
    return emails.filter((e) => e.verification_status === statusFilter);
  }, [emails, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter ?? ""}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground"
        >
          <option value="">Alle statussen</option>
          <option value="draft">Concept</option>
          <option value="verified">Geverifieerd</option>
        </select>

        {statusFilter && (
          <button
            onClick={() => setStatusFilter(null)}
            className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Wis filter
          </button>
        )}

        <span className="text-xs text-muted-foreground">
          {filtered.length} email{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Email list */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Geen emails gevonden.</p>
      ) : (
        <div className="divide-y divide-border/40">
          {filtered.map((email) => (
            <Link
              key={email.id}
              href={`/emails/${email.id}`}
              className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium leading-snug">
                    {email.subject ?? "(geen onderwerp)"}
                  </p>
                  {email.has_attachments && (
                    <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {email.from_name ?? email.from_address}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  {email.organization && (
                    <span className="flex items-center gap-0.5">
                      <Building2 className="h-3 w-3" />
                      {email.organization.name}
                    </span>
                  )}
                  {email.projects.length > 0 && (
                    <span className="flex items-center gap-0.5">
                      <FolderKanban className="h-3 w-3" />
                      {email.projects.map((p) => p.name).join(", ")}
                    </span>
                  )}
                  {relevanceBadge(email.relevance_score)}
                  {!email.is_processed && (
                    <Badge variant="outline" className="h-4 text-[10px]">
                      Nieuw
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{formatDate(email.date)}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
