import type { ThemeShareSlice } from "@repo/database/queries/themes";
import { paletteColor } from "./donut-palette";

export interface DonutSegment {
  slice: ThemeShareSlice;
  color: string;
  dash: number;
  offset: number;
  percent: number;
  index: number;
}

/**
 * Converteert `ThemeShareSlice[]` naar segmenten klaar voor de SVG stroke-
 * dasharray-truc:
 *  - `dash` = lengte van het zichtbare segment (share × omtrek)
 *  - `offset` = cumulative start-positie van dit segment
 *  - `percent` = afgeronde weergave voor legend/center-label
 *
 * Pure functie; geen React, geen DOM — zodat de rekening in een losse unit
 * test verifieerbaar is.
 */
export function buildSegments(slices: ThemeShareSlice[], circumference: number): DonutSegment[] {
  const segments: DonutSegment[] = [];
  let cumulativeOffset = 0;
  slices.forEach((slice, index) => {
    const dash = slice.share * circumference;
    segments.push({
      slice,
      color: paletteColor(index),
      dash,
      offset: cumulativeOffset,
      percent: Math.round(slice.share * 100),
      index,
    });
    cumulativeOffset += dash;
  });
  return segments;
}
