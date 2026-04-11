"use client";

import { useState, useTransition } from "react";
import { ExtractionCard } from "@/components/shared/extraction-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateExtractionAction, deleteExtractionAction } from "@/actions/entities";
import type { PersonForAssignment } from "@repo/database/queries/people";

interface EditableExtractionCardProps {
  extraction: {
    id: string;
    type: string;
    content: string;
    confidence: number | null;
    transcript_ref: string | null;
  };
  meetingId: string;
  promotedExtractionIds?: string[];
  peopleForAssignment?: PersonForAssignment[];
}

export function EditableExtractionCard({
  extraction,
  meetingId,
  promotedExtractionIds,
  peopleForAssignment,
}: EditableExtractionCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEdit(id: string, content: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateExtractionAction({ id, content, meetingId });
      if ("error" in result) setError(result.error);
    });
  }

  function handleDelete() {
    setDeleteOpen(true);
  }

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteExtractionAction({ id: extraction.id, meetingId });
      if ("error" in result) {
        setError(result.error);
        setDeleteOpen(false);
      } else {
        setDeleteOpen(false);
      }
    });
  }

  return (
    <>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <ExtractionCard
        extraction={extraction}
        readOnly={false}
        showPromote
        isPromoted={promotedExtractionIds?.includes(extraction.id)}
        people={peopleForAssignment}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Extractie verwijderen"
        description="Weet je zeker dat je deze extractie wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        loading={isPending}
      />
    </>
  );
}
