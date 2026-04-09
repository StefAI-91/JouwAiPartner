"use client";

import { useState, useTransition } from "react";
import { createCommentAction } from "@/actions/issues";
import { Button } from "@repo/ui/button";

export function CommentForm({ issueId }: { issueId: string }) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await createCommentAction({ issue_id: issueId, body: body.trim() });
      if ("error" in result) {
        setError(result.error);
      } else {
        setBody("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Voeg een reactie toe..."
        rows={3}
        maxLength={10000}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 resize-y"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
          {isPending ? "Plaatsen..." : "Reactie plaatsen"}
        </Button>
      </div>
    </form>
  );
}
