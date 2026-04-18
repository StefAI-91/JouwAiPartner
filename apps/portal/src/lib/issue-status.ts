/**
 * Portal status-UI helpers — afgeleid van de centrale mapping in
 * `@repo/database/constants/issues`. Voeg hier GEEN hardcoded mapping toe;
 * wijzig alleen de bron.
 */

import {
  INTERNAL_STATUS_TO_PORTAL_KEY,
  PORTAL_STATUS_LABELS,
  type PortalStatusKey,
  type PortalStatusLabel,
} from "@repo/database/constants/issues";

export type { PortalStatusKey, PortalStatusLabel };

export const STATUS_COLORS: Record<PortalStatusKey, string> = {
  ontvangen: "bg-blue-50 text-blue-700 border-blue-200",
  ingepland: "bg-amber-50 text-amber-700 border-amber-200",
  in_behandeling: "bg-violet-50 text-violet-700 border-violet-200",
  afgerond: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

/**
 * Vertaal een interne issue-status naar het portal-label. Valt terug op de
 * input zelf bij een onbekende status, zodat we niets stilletjes verliezen.
 */
export function translateStatus(internalStatus: string): string {
  const key =
    INTERNAL_STATUS_TO_PORTAL_KEY[internalStatus as keyof typeof INTERNAL_STATUS_TO_PORTAL_KEY];
  return key ? PORTAL_STATUS_LABELS[key] : internalStatus;
}

/**
 * Map een interne status naar zijn portal-groep key. Returned `null` voor
 * onbekende statussen (caller kiest een fallback).
 */
export function getPortalStatusKey(internalStatus: string): PortalStatusKey | null {
  return (
    INTERNAL_STATUS_TO_PORTAL_KEY[internalStatus as keyof typeof INTERNAL_STATUS_TO_PORTAL_KEY] ??
    null
  );
}
