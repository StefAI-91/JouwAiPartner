/**
 * Parser for kernpunten markdown produced by the (legacy) summarizer.
 *
 * @deprecated Sinds de splitsing van extractie-paden produceert de
 *   Summarizer geen `**Besluit:** / **Risico:** / ...` labels meer.
 *   Nieuwe meetings hebben dus platte kernpunten-zinnen; parsing levert
 *   een lege array op. Gespecialiseerde extractor-agents schrijven hun
 *   output rechtstreeks naar de `extractions`-tabel.
 *
 *   Deze parser blijft alleen staan voor backcompat op historische
 *   meetings die nog gelabelde kernpunten bevatten. Zodra die via een
 *   batch-her-extractie zijn gemigreerd mag dit bestand weg. Zie
 *   `docs/specs/extraction-paths.md`.
 *
 * Historisch formaat:
 *   - `### [ProjectNaam] Themanaam` — theme header
 *   - `**Risico:** ...` / `**Besluit:** ...` / etc. — categorised bullets
 *   - bare strings — uncategorised context
 */

export const PARSED_EXTRACTION_TYPES = [
  "risico",
  "besluit",
  "behoefte",
  "signaal",
  "visie",
  "afspraak",
  "context",
  "voorbeeld",
] as const;

export type ParsedExtractionType = (typeof PARSED_EXTRACTION_TYPES)[number];

export interface ParsedExtraction {
  type: ParsedExtractionType;
  content: string;
  theme: string | null;
}

const HEADER_RE = /^\s*#{2,}\s*\[([^\]]+)\]\s*(.*)$/;
const BULLET_RE = /^\s*(?:[-*•]\s+)?\*\*([A-Za-zÀ-ÿ]+):\*\*\s*(.+)$/;

const TYPE_LOOKUP = new Map<string, ParsedExtractionType>(
  PARSED_EXTRACTION_TYPES.map((t) => [t, t]),
);

function normaliseType(raw: string): ParsedExtractionType | null {
  return TYPE_LOOKUP.get(raw.trim().toLowerCase()) ?? null;
}

export function parseMarkdownExtractions(kernpunten: string[]): ParsedExtraction[] {
  const out: ParsedExtraction[] = [];
  let currentTheme: string | null = null;

  for (const raw of kernpunten) {
    if (typeof raw !== "string") continue;
    const line = raw.trim();
    if (!line) continue;

    const headerMatch = line.match(HEADER_RE);
    if (headerMatch) {
      const themeName = headerMatch[2]?.trim();
      currentTheme = themeName && themeName.length > 0 ? themeName : null;
      continue;
    }

    const bulletMatch = line.match(BULLET_RE);
    if (!bulletMatch) continue;

    const type = normaliseType(bulletMatch[1]);
    if (!type) continue;

    const content = bulletMatch[2].trim();
    if (!content) continue;

    out.push({ type, content, theme: currentTheme });
  }

  return out;
}

export function filterByType(
  parsed: ParsedExtraction[],
  type: ParsedExtractionType,
): ParsedExtraction[] {
  return parsed.filter((p) => p.type === type);
}
