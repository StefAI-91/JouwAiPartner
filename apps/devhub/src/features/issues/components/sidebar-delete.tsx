"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@repo/ui/button";
import { deleteIssueAction } from "../actions/issues";
import { issueCountStore } from "@/components/layout/issue-count-store";

interface SidebarDeleteProps {
  issueId: string;
  projectId: string;
  status: string;
  isPending: boolean;
}

export function SidebarDelete({ issueId, projectId, status, isPending }: SidebarDeleteProps) {
  const [, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    // Decrement the sidebar count before we navigate away so the badge is
    // already correct when the issue list renders.
    issueCountStore.bump(projectId, status, null);

    startTransition(async () => {
      const result = await deleteIssueAction({ id: issueId });
      if ("error" in result) {
        console.error(result.error);
        issueCountStore.bump(projectId, null, status);
      } else {
        window.location.href = `/issues?project=${projectId}`;
      }
    });
  }

  return (
    <div className="border-t border-border pt-4">
      {showConfirm ? (
        <div className="space-y-2">
          <p className="text-xs text-destructive">
            Weet je zeker dat je dit issue wilt verwijderen?
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
              Verwijderen
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
              Annuleren
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 className="size-3.5" />
          Verwijder issue
        </Button>
      )}
    </div>
  );
}
