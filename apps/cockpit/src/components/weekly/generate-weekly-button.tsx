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
        className="inline-flex items-center gap-2 rounded-lg bg-[#006B3F] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#005a35] disabled:opacity-50 transition-colors"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Bezig met genereren..." : "Weekoverzicht genereren"}
      </button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
