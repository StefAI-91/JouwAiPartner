"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createSprintAction } from "../actions/sprints";

interface AddSprintButtonProps {
  projectId: string;
  nextOrderIndex: number;
  lastDeliveryWeek: string | null;
}

/**
 * Bereken volgende maandag in UTC, op of na `from`. Als `from` zelf een
 * maandag is, returnt de week erna (we willen niet over een al-bestaande
 * sprint heen). Pure helper — als de logica complexer wordt, verhuizen
 * naar een test-bare util.
 */
function nextMondayAfter(from: Date): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const day = d.getUTCDay();
  const offset = (1 - day + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function AddSprintButton({
  projectId,
  nextOrderIndex,
  lastDeliveryWeek,
}: AddSprintButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const create = () => {
    const baseDate = lastDeliveryWeek ? new Date(`${lastDeliveryWeek}T00:00:00Z`) : new Date();
    const deliveryWeek = nextMondayAfter(baseDate);
    const name = `Sprint ${nextOrderIndex + 1}`;

    startTransition(async () => {
      const result = await createSprintAction({
        project_id: projectId,
        name,
        delivery_week: deliveryWeek,
        summary: null,
        status: "planned",
      });
      if ("error" in result) {
        // Server-action errors verschijnen op de pagina via revalidate;
        // hier alleen een ondergeschikte alert om snelle feedback te geven.
        alert(`Kon sprint niet toevoegen: ${result.error}`);
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={create}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 bg-white px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Plus className="h-3.5 w-3.5" />
      )}
      Sprint toevoegen
    </button>
  );
}
