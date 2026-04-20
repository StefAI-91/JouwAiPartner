import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDate,
  formatDateShort,
  formatDateLong,
  timeAgo,
  timeAgoDays,
  daysUntil,
  truncate,
} from "../src/format";

// Q3b §6: UI-package eerste pure-helper tests. Alle datum-helpers gebruiken
// nl-NL locale (zie format.ts top-comment) — afhankelijk van de Intl-API in
// jsdom/node.

describe("formatDate", () => {
  it("formatteert datum als nl-NL day month year", () => {
    expect(formatDate("2026-04-20")).toContain("20");
    expect(formatDate("2026-04-20").toLowerCase()).toContain("apr");
    expect(formatDate("2026-04-20")).toContain("2026");
  });

  it("returnt lege string voor null input (no silent throw)", () => {
    expect(formatDate(null)).toBe("");
  });
});

describe("formatDateShort", () => {
  it("toont alleen day + month (geen year)", () => {
    const out = formatDateShort("2026-04-20");
    expect(out).toContain("20");
    expect(out).not.toContain("2026");
  });

  it("returnt lege string voor null", () => {
    expect(formatDateShort(null)).toBe("");
  });
});

describe("formatDateLong", () => {
  it("toont weekday + day + month + year", () => {
    const out = formatDateLong("2026-04-20");
    // 20-04-2026 is een maandag in NL.
    expect(out.toLowerCase()).toContain("maandag");
    expect(out).toContain("2026");
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rendert minuten voor recente events", () => {
    expect(timeAgo("2026-04-20T11:45:00Z")).toBe("15m ago");
  });

  it("rendert uren onder 24h", () => {
    expect(timeAgo("2026-04-20T08:00:00Z")).toBe("4h ago");
  });

  it("rendert dagen voor oudere events", () => {
    expect(timeAgo("2026-04-17T12:00:00Z")).toBe("3d ago");
  });
});

describe("timeAgoDays (NL)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("zegt 'vandaag' bij 0 dagen", () => {
    expect(timeAgoDays("2026-04-20T08:00:00Z")).toBe("vandaag");
  });

  it("zegt 'gisteren' bij 1 dag", () => {
    expect(timeAgoDays("2026-04-19T08:00:00Z")).toBe("gisteren");
  });

  it("zegt 'N dagen geleden' bij ≥2 dagen", () => {
    expect(timeAgoDays("2026-04-15T08:00:00Z")).toBe("5 dagen geleden");
  });
});

describe("daysUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retourneert positief getal voor toekomstige datum", () => {
    expect(daysUntil("2026-04-25")).toBeGreaterThan(0);
  });

  it("retourneert negatief getal voor verleden datum", () => {
    expect(daysUntil("2026-04-10")).toBeLessThan(0);
  });
});

describe("truncate", () => {
  it("laat tekst onveranderd onder de limiet", () => {
    expect(truncate("hallo", 10)).toBe("hallo");
  });

  it("knipt tekst af met ellipsis (\u2026) bij overschrijden", () => {
    expect(truncate("dit is een lange tekst", 10)).toBe("dit is een\u2026");
  });

  it("trimt trailing whitespace voor de ellipsis", () => {
    expect(truncate("dit is   een", 7)).toBe("dit is\u2026");
  });
});
