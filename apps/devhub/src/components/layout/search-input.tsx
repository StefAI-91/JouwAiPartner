"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

const DEBOUNCE_MS = 250;

/**
 * Global issue search — lives in the top bar and writes to `?q=`. Accepts
 * plain keywords (ilike on title/description) or an issue number like
 * `#464` / `464`.
 *
 * The tricky part is keeping the input and the URL in sync without the URL
 * clobbering what the user is typing. A naive `useEffect(() => setValue(
 * currentQ), [currentQ])` races against the user: the debounce pushes the
 * URL, the URL change fires the effect, the effect overwrites the input
 * with the (now stale) URL value while the user is already typing the next
 * character. The `lastPushedRef` trick below tracks what *we* last wrote,
 * so only changes from elsewhere (browser back/forward, sidebar nav) pull
 * the input back in sync.
 */
export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const [value, setValue] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushedRef = useRef(currentQ);

  useEffect(() => {
    // Skip when this URL change came from our own push — the input is
    // already ahead of it. Only mirror changes that originate elsewhere.
    if (currentQ === lastPushedRef.current) return;
    lastPushedRef.current = currentQ;
    setValue(currentQ);
  }, [currentQ]);

  function push(next: string) {
    const trimmed = next.trim();
    lastPushedRef.current = trimmed;

    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    params.delete("page");
    const qs = params.toString();

    startTransition(() => {
      router.push(qs ? `/issues?${qs}` : "/issues");
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
