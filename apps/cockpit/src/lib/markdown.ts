/** Split markdown into sections by ## headings or **bold** lines */
export interface MarkdownSection {
  heading: string;
  body: string;
  raw: string;
}

const HEADING_PATTERN = /^#{1,3}\s+/;
const BOLD_SECTION_PATTERN = /^-?\s*\*\*(.+?)\*\*/;

export function isSectionStart(line: string): string | null {
  const headingMatch = line.match(HEADING_PATTERN);
  if (headingMatch) {
    return line.replace(HEADING_PATTERN, "").replace(/\*\*/g, "").trim();
  }
  const boldMatch = line.match(BOLD_SECTION_PATTERN);
  if (boldMatch) {
    return boldMatch[1].trim();
  }
  return null;
}

export function parseSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split("\n");
  const sections: MarkdownSection[] = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  function flush() {
    const raw = currentLines.join("\n").trim();
    if (raw) {
      sections.push({
        heading: currentHeading,
        body: currentHeading ? currentLines.slice(1).join("\n").trim() : raw,
        raw,
      });
    }
  }

  for (const line of lines) {
    const sectionHeading = isSectionStart(line);
    if (sectionHeading) {
      flush();
      currentHeading = sectionHeading;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}

export function rebuildMarkdown(sections: MarkdownSection[]): string {
  return sections.map((s) => s.raw).join("\n\n");
}

export { BOLD_SECTION_PATTERN };
