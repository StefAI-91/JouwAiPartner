import { getAdminClient } from "../supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NeedStatus = "open" | "erkend" | "afgewezen" | "opgelost";

export interface NeedRow {
  id: string;
  content: string;
  metadata: {
    category: string;
    priority: string;
    context: string;
    source: string;
    status: NeedStatus;
  };
  meeting: { id: string; title: string; date: string | null } | null;
  created_at: string;
}

export interface NeedsByCategory {
  category: string;
  label: string;
  needs: NeedRow[];
}

const CATEGORY_LABELS: Record<string, string> = {
  tooling: "Tooling & Infrastructuur",
  kennis: "Kennis & Expertise",
  capaciteit: "Capaciteit & Resources",
  proces: "Proces & Werkwijze",
  klant: "Klantwensen",
  overig: "Overig",
};

const CATEGORY_ORDER = ["tooling", "kennis", "capaciteit", "proces", "klant", "overig"];

/**
 * List needs grouped by category.
 * By default only shows "open" and "erkend" needs.
 */
export async function listNeedsGroupedByCategory(
  client?: SupabaseClient,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<{ grouped: NeedsByCategory[]; total: number }> {
  const db = client ?? getAdminClient();

  const { data, error } = await db
    .from("extractions")
    .select(
      `id, content, metadata, created_at,
       meeting:meeting_id (id, title, date)`,
    )
    .eq("type", "need")
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false });

  if (error || !data) return { grouped: [], total: 0 };

  const allNeeds = data as unknown as NeedRow[];

  // Filter by status: default shows only open + erkend
  const needs = includeArchived
    ? allNeeds
    : allNeeds.filter((n) => {
        const status = n.metadata?.status ?? "open";
        return status === "open" || status === "erkend";
      });

  // Group by category
  const categoryMap = new Map<string, NeedRow[]>();
  for (const need of needs) {
    const category = need.metadata?.category ?? "overig";
    const list = categoryMap.get(category) ?? [];
    list.push(need);
    categoryMap.set(category, list);
  }

  // Sort by defined order
  const grouped: NeedsByCategory[] = CATEGORY_ORDER.filter((cat) => categoryMap.has(cat)).map(
    (cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] ?? cat,
      needs: categoryMap.get(cat)!,
    }),
  );

  return { grouped, total: needs.length };
}

/**
 * Count active needs (open + erkend) for badge display.
 */
export async function countNeeds(client?: SupabaseClient): Promise<number> {
  const db = client ?? getAdminClient();

  const { data } = await db
    .from("extractions")
    .select("metadata")
    .eq("type", "need")
    .eq("verification_status", "verified");

  if (!data) return 0;

  return data.filter((row) => {
    const status = (row.metadata as Record<string, unknown>)?.status ?? "open";
    return status === "open" || status === "erkend";
  }).length;
}
