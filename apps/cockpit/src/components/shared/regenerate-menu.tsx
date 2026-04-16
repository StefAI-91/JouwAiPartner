"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@repo/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@repo/ui/dropdown-menu";
import { regenerateMeetingAction, reprocessMeetingAction } from "@/actions/meeting-pipeline";
import { regenerateMeetingTitleAction } from "@/actions/meetings";

interface RegenerateMenuProps {
  meetingId: string;
}

export function RegenerateMenu({ meetingId }: RegenerateMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"regenerate" | "reprocess" | "title" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
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

  async function handleRegenerateTitle() {
    setLoading("title");
    setError(null);

    const result = await regenerateMeetingTitleAction({ meetingId });
    if ("error" in result) {
      setError(result.error);
      setLoading(null);
      return;
    }
    router.refresh();
    setLoading(null);
  }

  async function handleReprocess() {
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
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" disabled={!!loading}>
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading === "regenerate"
                ? "Regenereren..."
                : loading === "reprocess"
                  ? "Herverwerken..."
                  : loading === "title"
                    ? "Titel genereren..."
                    : "Regenereer"}
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="w-56 border border-border bg-background shadow-lg dark:bg-card"
        >
          <DropdownMenuItem onClick={handleRegenerateTitle}>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">Titel regenereren</span>
              <span className="text-xs text-muted-foreground">
                AI-titel op basis van samenvatting
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRegenerate}>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">Regenereer</span>
              <span className="text-xs text-muted-foreground">Summary + extracties opnieuw</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleReprocess}>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">Volledig herverwerken</span>
              <span className="text-xs text-muted-foreground">
                Ophalen van Fireflies + volledige pipeline
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
