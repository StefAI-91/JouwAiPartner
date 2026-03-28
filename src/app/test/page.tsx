"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  content: string;
  title: string;
  source_table: string;
  similarity: number;
}

interface IngestResult {
  id: string;
  title: string;
  status: "imported" | "skipped" | "failed";
  reason?: string;
  relevance_score?: number;
  action?: string;
}

interface IngestResponse {
  summary: { total: number; imported: number; skipped: number; failed: number };
  embeddings: { processed: number; byTable: Record<string, number> } | null;
  results: IngestResult[];
}

export default function TestSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [timing, setTiming] = useState<number | null>(null);

  const [ingesting, setIngesting] = useState(false);

  const [ingestData, setIngestData] = useState<IngestResponse | null>(null);

  const [ingestError, setIngestError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [askSources, setAskSources] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [askPlan, setAskPlan] = useState<any | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [askTiming, setAskTiming] = useState<number | null>(null);

  const [embedding, setEmbedding] = useState(false);
  const [embedData, setEmbedData] = useState<{
    processed: number;
    byTable: Record<string, number>;
  } | null>(null);
  const [embedError, setEmbedError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setTiming(null);

    const start = performance.now();

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();
      const elapsed = performance.now() - start;
      setTiming(Math.round(elapsed));

      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }

      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleIngest() {
    setIngesting(true);
    setIngestError(null);
    setIngestData(null);

    try {
      const res = await fetch("/api/ingest/fireflies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIngestError(data.error || "Ingest failed");
        return;
      }

      setIngestData(data);
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIngesting(false);
    }
  }

  async function handleEmbed() {
    setEmbedding(true);
    setEmbedError(null);
    setEmbedData(null);

    try {
      const res = await fetch("/api/test/embed", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setEmbedError(data.error || "Embedding failed");
        return;
      }

      setEmbedData({ processed: data.processed, byTable: data.byTable });
    } catch (err) {
      setEmbedError(err instanceof Error ? err.message : "Network error");
    } finally {
      setEmbedding(false);
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!askQuestion.trim()) return;

    setAsking(true);
    setAskError(null);
    setAskAnswer(null);
    setAskSources([]);
    setAskPlan(null);
    setAskTiming(null);

    const start = performance.now();

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: askQuestion.trim() }),
      });

      const data = await res.json();
      setAskTiming(Math.round(performance.now() - start));

      if (!res.ok) {
        setAskError(data.error || "Ask failed");
        return;
      }

      setAskAnswer(data.answer);
      setAskSources(data.sources ?? []);
      setAskPlan(data.plan ?? null);
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Network error");
    } finally {
      setAsking(false);
    }
  }

  const sourceColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    documents: "default",
    meetings: "secondary",
    slack_messages: "outline",
    emails: "destructive",
  };

  const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    imported: "default",
    skipped: "outline",
    failed: "destructive",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Ingest Section */}
      <section className="mb-12">
        <h1 className="mb-2 text-2xl font-bold">Fireflies Ingest</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Haal recente transcripts op uit Fireflies en verwerk ze door de Gatekeeper pipeline
          (score, extract, embed).
        </p>

        <div className="flex gap-3">
          <Button onClick={handleIngest} disabled={ingesting} variant="outline" size="lg">
            {ingesting ? "Transcripts verwerken..." : "Importeer Fireflies transcripts"}
          </Button>
          <Button onClick={handleEmbed} disabled={embedding} variant="outline" size="lg">
            {embedding ? "Embeddings genereren..." : "Genereer embeddings"}
          </Button>
        </div>

        {embedError && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {embedError}
          </div>
        )}

        {embedData && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-800 dark:bg-blue-950">
            <strong>{embedData.processed}</strong> embeddings gegenereerd
            {embedData.processed > 0 && (
              <span className="text-muted-foreground">
                {" "}
                (
                {Object.entries(embedData.byTable)
                  .filter(([, n]) => n > 0)
                  .map(([t, n]) => `${t}: ${n}`)
                  .join(", ")}
                )
              </span>
            )}
            {embedData.processed === 0 && (
              <span className="text-muted-foreground"> — geen stale rows gevonden</span>
            )}
          </div>
        )}

        {ingestError && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {ingestError}
          </div>
        )}

        {ingestData && (
          <div className="mt-4">
            <div className="mb-3 flex gap-4 text-sm">
              <span>
                Totaal: <strong>{ingestData.summary?.total ?? 0}</strong>
              </span>
              <span className="text-green-600">
                Imported: <strong>{ingestData.summary?.imported ?? 0}</strong>
              </span>
              <span className="text-muted-foreground">
                Skipped: <strong>{ingestData.summary?.skipped ?? 0}</strong>
              </span>
              <span className="text-destructive">
                Failed: <strong>{ingestData.summary?.failed ?? 0}</strong>
              </span>
              {ingestData.embeddings && (
                <span className="text-blue-600">
                  Embedded: <strong>{ingestData.embeddings.processed}</strong> (
                  {Object.entries(ingestData.embeddings.byTable)
                    .filter(([, n]) => n > 0)
                    .map(([t, n]) => `${t}: ${n}`)
                    .join(", ")}
                  )
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {ingestData.results.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <Badge variant={statusColors[r.status] ?? "outline"}>{r.status}</Badge>
                  <span className="flex-1 truncate font-medium">{r.title}</span>
                  {r.relevance_score != null && (
                    <span className="text-xs text-muted-foreground">
                      score: {(r.relevance_score * 100).toFixed(0)}%
                    </span>
                  )}
                  {r.reason && (
                    <span className="max-w-48 truncate text-xs text-muted-foreground">
                      {r.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Search Section */}
      <section>
        <h2 className="mb-2 text-2xl font-bold">Vector Search Test</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Test de semantic search over alle content tabellen (documents, meetings, slack, emails).
        </p>

        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op betekenis, bijv. 'onboarding proces nieuwe medewerkers'..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/50"
          />
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? "Zoeken..." : "Zoek"}
          </Button>
        </form>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {timing !== null && (
          <p className="mb-4 text-xs text-muted-foreground">
            {results.length} resultaten in {timing}ms
          </p>
        )}

        <div className="flex flex-col gap-3">
          {results.map((result) => (
            <Card key={result.id} size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.title || "Untitled"}
                  <Badge variant={sourceColors[result.source_table] ?? "outline"}>
                    {result.source_table}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Similarity: {(result.similarity * 100).toFixed(1)}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-4 text-sm text-muted-foreground whitespace-pre-wrap">
                  {result.content}
                </p>
              </CardContent>
            </Card>
          ))}

          {timing !== null && results.length === 0 && !error && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Geen resultaten gevonden. Probeer een andere zoekopdracht of verlaag de threshold.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
