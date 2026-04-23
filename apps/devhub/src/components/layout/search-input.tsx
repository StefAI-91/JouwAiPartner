"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

const DEBOUNCE_MS = 250;

/**
 * Global issue search — lives in the top bar and writes to `?q=`. Accepts
 * plain keywords (ilike on title/description) or an issue number like
 * `#464` / `464`. Only visible on the /issues list; on other pages the
 * input still renders but submitting redirects to /issues.
 */
export function SearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const projectId = searchParams.get("project");
  const currentQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync back when URL changes externally (browser back/forward, sidebar nav).
  useEffect(() => {
    setValue(currentQ);
  }, [currentQ]);

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) {
      params.set("q", next.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");

    // Preserve project scope when redirecting from non-issues routes.
    const base = pathname === "/issues" ? "/issues" : "/issues";
    if (projectId && !params.has("project")) params.set("project", projectId);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${base}?${qs}` : base);
    });
  }

  function onChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push(next), DEBOUNCE_MS);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    push(value);
  }

  function onClear() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setValue("");
    push("");
  }

  return (
    <form onSubmit={onSubmit} className="relative hidden w-full max-w-sm sm:block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Zoek issues of #nummer"
        aria-label="Zoek issues"
        className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Wis zoekopdracht"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </form>
  );
}
