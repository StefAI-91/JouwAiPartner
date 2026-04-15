"use client";

import { useState, useTransition } from "react";
import { Filter, Loader2 } from "lucide-react";
import { Button } from "@repo/ui/button";
import { unfilterEmailAction } from "@/actions/email-filter";

interface FilteredBannerProps {
  emailId: string;
  filterReason: string | null;
}

const REASON_LABELS: Record<string, { label: string; explanation: string }> = {
  newsletter: {
    label: "Nieuwsbrief",
    explanation: "Gemarkeerd als marketing/nieuwsbrief.",
  },
  notification: {
    label: "Notificatie",
    explanation: "Automatische notificatie (GitHub, Vercel, calendar, etc.).",
  },
  cold_outreach: {
    label: "Cold outreach",
    explanation: "Ongevraagde commerciële outreach naar ons toe.",
  },
  low_relevance: {
    label: "Lage relevantie",
    explanation: "Relevantie-score onder 0.4 en geen beschermde partij.",
  },
};

export function FilteredBanner({ emailId, filterReason }: FilteredBannerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const reasonInfo = filterReason ? REASON_LABELS[filterReason] : null;

  function handleUnfilter() {
    setError(null);
    startTransition(async () => {
      const result = await unfilterEmailAction({ emailId });
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Filter className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              Gefilterd door de AI-gatekeeper
              {reasonInfo && <span className="ml-1">· {reasonInfo.label}</span>}
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              {reasonInfo?.explanation ??
                "Deze email is buiten de hoofd-inbox gehouden en staat alleen in de audit-tab."}
            </p>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnfilter}
          disabled={isPending}
          className="shrink-0 bg-white"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Doorlaten…
            </>
          ) : (
            "Alsnog doorlaten"
          )}
        </Button>
      </div>
    </div>
  );
}
