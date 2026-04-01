"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp } from "lucide-react";

const COLLAPSED_MAX_HEIGHT = 160; // px

export function MarkdownSummary({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Summary</h3>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              Minder <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              Meer lezen <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      </div>
      <div
        className="relative overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: expanded ? "none" : `${COLLAPSED_MAX_HEIGHT}px` }}
      >
        <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground/80 [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground/70 [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:my-1 [&_ul]:pl-4 [&_li]:text-sm [&_li]:leading-relaxed [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1 [&_strong]:text-foreground/80">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-muted/50 to-transparent" />
        )}
      </div>
    </div>
  );
}
