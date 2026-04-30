"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Plus, X } from "lucide-react";
import { Button } from "@repo/ui/button";
import { addWidgetDomainAction, removeWidgetDomainAction } from "@/actions/widget-domains";

interface WidgetDomainsCardProps {
  projectId: string;
  projectName: string;
  domains: string[];
  loaderUrl: string;
}

export function WidgetDomainsCard({
  projectId,
  projectName,
  domains,
  loaderUrl,
}: WidgetDomainsCardProps) {
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const snippet = `<script src="${loaderUrl}" data-project="${projectId}" async></script>`;

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addWidgetDomainAction({ projectId, domain });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDomain("");
    });
  }

  function handleRemove(target: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeWidgetDomainAction({ projectId, domain: target });
      if ("error" in result) setError(result.error);
    });
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
    setSnippetCopied(true);
    window.setTimeout(() => setSnippetCopied(false), 1800);
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{projectName}</h2>
        <span className="font-mono text-[0.7rem] text-muted-foreground">{projectId}</span>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Whitelisted domeinen
        </p>
        {domains.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nog geen domeinen — feedback voor dit project wordt geweigerd tot je er één toevoegt.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {domains.map((d) => (
              <li
                key={d}
                className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-1.5"
              >
                <span className="font-mono text-sm">{d}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(d)}
                  disabled={pending}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-50"
                  aria-label={`Verwijder ${d}`}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleAdd();
        }}
      >
        <input
          type="text"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="app.klant.nl"
          className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-primary"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" size="sm" disabled={pending || domain.trim().length === 0}>
          <Plus className="size-4" />
          Toevoegen
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Installatie-snippet
        </p>
        <div className="mt-2 flex items-stretch gap-2">
          <code className="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-[0.75rem]">
            {snippet}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copySnippet}
            aria-label="Snippet kopiëren"
          >
            {snippetCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {snippetCopied ? "Gekopieerd" : "Kopieer"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Voor ingelogde gebruikers: voeg <code>{`data-user-email="…"`}</code> toe of roep{" "}
          <code>{`window.__JAIPWidgetIdentify({ email })`}</code> aan na login.
        </p>
      </div>
    </div>
  );
}
