"use client";

import { useState, useTransition } from "react";
import { ExtractionCard } from "@/components/shared/extraction-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  updateExtractionAction,
  deleteExtractionAction,
} from "@/actions/entities";
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
  const [isPending, startTransition] = useTransition();

  function handleEdit(id: string, content: string) {
    startTransition(async () => {
      await updateExtractionAction({ id, content, meetingId });
    });
  }

  function handleDelete(id: string) {
    setDeleteOpen(true);
  }

  function confirmDelete() {
    startTransition(async () => {
      await deleteExtractionAction({ id: extraction.id, meetingId });
      setDeleteOpen(false);
    });
  }

  return (
    <>
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
        title="Delete Extraction"
        description="Are you sure you want to delete this extraction? This cannot be undone."
        loading={isPending}
      />
    </>
  );
}
