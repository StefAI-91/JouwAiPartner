"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { scanTeamNeedsAction } from "@/actions/scan-needs";

export function ScanNeedsButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleScan() {
    setLoading(true);
    setResult(null);
    try {
      const res = await scanTeamNeedsAction();
      if ("error" in res) {
        setResult(res.error);
      } else if (res.scanned === 0) {
        setResult("Alle meetings zijn al gescand.");
      } else {
        setResult(
          `${res.scanned} meeting${res.scanned !== 1 ? "s" : ""} gescand, ${res.needs} nieuwe behoefte${res.needs !== 1 ? "s" : ""} gevonden.`,
        );
      }
    } catch {
      setResult("Er ging iets mis bij het scannen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleScan}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#006B3F] px-3 py-2 text-xs font-medium text-white hover:bg-[#005a35] disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Scannen..." : "Scannen"}
      </button>
      {result && <p className="text-[11px] text-muted-foreground">{result}</p>}
    </div>
  );
}
