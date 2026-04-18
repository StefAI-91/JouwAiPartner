import type { ParsedExtractionType } from "@repo/ai/utils/summary-markdown-parser";

export interface WorkspaceParsedItem {
  type: ParsedExtractionType;
  content: string;
  theme: string | null;
  source_meeting: { id: string; title: string | null } | null;
}
