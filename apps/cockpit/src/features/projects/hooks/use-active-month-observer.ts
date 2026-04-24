"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Volgt welke maand momenteel het meest in beeld is binnen een scrollbare
 * container. Gebruikt IntersectionObserver met `root` = de container-ref,
 * niet de window — zodat scrollen op de page de active-month niet beïnvloedt.
 *
 * Entries moeten een `data-month`-attribuut hebben op een voorouder-element
 * van de geobserveerde `.timeline-entry`-elementen.
 */
export function useActiveMonthObserver(
  containerRef: RefObject<HTMLElement | null>,
  entrySelector: string = "[data-entry]",
  initialMonth: string | null = null,
): string | null {
  const [activeMonth, setActiveMonth] = useState<string | null>(initialMonth);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const entries = container.querySelectorAll<HTMLElement>(entrySelector);
    if (entries.length === 0) return;

    let lastVisible: string | null = initialMonth;

    const observer = new IntersectionObserver(
      (items) => {
        for (const item of items) {
          if (item.isIntersecting && item.intersectionRatio > 0.3) {
            const month = (item.target as HTMLElement).closest<HTMLElement>("[data-month]")?.dataset
              .month;
            if (month) lastVisible = month;
          }
        }
        if (lastVisible) setActiveMonth(lastVisible);
      },
      { root: container, threshold: [0, 0.3, 0.6, 1] },
    );

    entries.forEach((entry) => observer.observe(entry));
    return () => observer.disconnect();
  }, [containerRef, entrySelector, initialMonth]);

  return activeMonth;
}
