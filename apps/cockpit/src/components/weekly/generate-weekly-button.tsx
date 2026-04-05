"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { generateWeeklySummaryAction } from "@/actions/weekly-summary";

export function GenerateWeeklyButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateWeeklySummaryAction({});
      if ("error" in result) {
        setError(result.error ?? "Onbekende fout.");
      }
    } catch {
      setError("Er ging iets mis bij het genereren.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#006B3F] px-3 py-2 text-xs font-medium text-white hover:bg-[#005a35] disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Genereren..." : "Genereren"}
      </button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
