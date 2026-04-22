/**
 * Vaste 10-palette voor de time-spent donut (TH-004 B8). Bewust buiten de
 * primary-kleur gehouden — de donut is een visueel hulpmiddel, geen CTA.
 * Top-6 kleuren zijn onderscheidend en WCAG-accessible op light background;
 * positie 7-9 dienen als fallback, positie 10 is neutraal grijs voor
 * "overige thema's". Kleuren zijn 1-op-1 overgenomen uit VariantB8 in
 * `theme-lab/variants/section-b.tsx`.
 */
export const DONUT_PALETTE = [
  "#006b3f",
  "#059669",
  "#0891b2",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#2563eb",
  "#65a30d",
  "#a1a1aa",
] as const;

export function paletteColor(index: number): string {
  return DONUT_PALETTE[index % DONUT_PALETTE.length];
}
