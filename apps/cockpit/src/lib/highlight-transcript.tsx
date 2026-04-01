import type React from "react";

export function highlightTranscript(
  text: string,
  transcriptRefs: Set<string>,
): React.ReactNode[] {
  if (transcriptRefs.size === 0) return [text];

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  for (const ref of transcriptRefs) {
    const idx = remaining.indexOf(ref);
    if (idx !== -1) {
      if (idx > 0) parts.push(remaining.slice(0, idx));
      parts.push(
        <mark key={key++} className="rounded bg-yellow-100/50 px-0.5">
          {ref}
        </mark>,
      );
      remaining = remaining.slice(idx + ref.length);
    }
  }
  if (remaining) parts.push(remaining);
  return parts;
}
