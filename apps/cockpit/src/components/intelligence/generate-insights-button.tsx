"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { generateManagementInsightsAction } from "@/actions/management-insights";

export function GenerateInsightsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await generateManagementInsightsAction();
      if ("error" in res) {
        setResult(res.error);
      } else {
        setResult("Inzichten gegenereerd.");
      }
    } catch {
      setResult("Er ging iets mis bij het genereren.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#006B3F] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#005a35] disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {loading ? "Genereren..." : "Genereer inzichten"}
      </button>
      {result && <p className="text-[11px] text-muted-foreground">{result}</p>}
    </div>
  );
}
