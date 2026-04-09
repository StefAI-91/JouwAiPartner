"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ChevronDown } from "lucide-react";
import { regenerateMeetingAction, reprocessMeetingAction } from "@/actions/meetings";

interface RegenerateMenuProps {
  meetingId: string;
}

export function RegenerateMenu({ meetingId }: RegenerateMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"regenerate" | "reprocess" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    setMenuOpen(false);
    setLoading("regenerate");
    setError(null);

    const result = await regenerateMeetingAction({ meetingId });
    if ("error" in result) {
      setError(result.error);
      setLoading(null);
      return;
    }
    router.refresh();
    setLoading(null);
  }

  async function handleReprocess() {
    setMenuOpen(false);

    const confirmed = window.confirm(
      "Weet je zeker dat je deze meeting volledig wilt herverwerken?\n\n" +
        "Dit haalt de meeting opnieuw op van Fireflies en verwerkt alles opnieuw. " +
        "De huidige samenvatting, extracties en koppelingen worden vervangen.",
    );
    if (!confirmed) return;

    setLoading("reprocess");
    setError(null);

    const result = await reprocessMeetingAction({ meetingId });
    if ("error" in result) {
      setError(result.error);
      setLoading(null);
      return;
    }
    router.refresh();
    setLoading(null);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        disabled={!!loading}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading === "regenerate"
          ? "Regenereren..."
          : loading === "reprocess"
            ? "Herverwerken..."
            : "Regenereer"}
        <ChevronDown className="size-3" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border bg-background shadow-lg">
            <button
              type="button"
              onClick={handleRegenerate}
              className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs hover:bg-muted"
            >
              <span className="font-medium">Regenereer</span>
              <span className="text-muted-foreground">Summary + extracties opnieuw</span>
            </button>
            <button
              type="button"
              onClick={handleReprocess}
              className="flex w-full flex-col gap-0.5 border-t border-border px-3 py-2 text-left text-xs hover:bg-muted"
            >
              <span className="font-medium">Volledig herverwerken</span>
              <span className="text-muted-foreground">
                Ophalen van Fireflies + volledige pipeline
              </span>
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
