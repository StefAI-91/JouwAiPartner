"use client";

import type { GoldenItemRow } from "@repo/database/queries/golden";
import { LANE_LABELS, TYPE_WERK_LABELS, type Lane, type TypeWerk } from "./coder-types";

interface Props {
  item: GoldenItemRow;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}

export function CoderItemCard({ item, onEdit, onDelete, isPending }: Props) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-medium leading-snug">{item.content}</p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            disabled={isPending}
            className="rounded-md border border-border/60 bg-background px-2 py-0.5 text-[11px] hover:bg-muted disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="rounded-md border border-destructive/40 bg-background px-2 py-0.5 text-[11px] text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            Del
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px]">
        <Chip>contact: {item.follow_up_contact}</Chip>
        {item.assignee && item.assignee !== item.follow_up_contact && (
          <Chip>assignee: {item.assignee}</Chip>
        )}
        <Chip variant={item.lane === "B" ? "primary" : "default"}>
          {LANE_LABELS[item.lane as Lane]}
        </Chip>
        <Chip>{TYPE_WERK_LABELS[item.type_werk as TypeWerk]}</Chip>
        {item.deadline && <Chip>deadline: {item.deadline}</Chip>}
        {item.category && <Chip>{item.category}</Chip>}
        {item.project_context && <Chip>project: {item.project_context}</Chip>}
      </div>
      {item.source_quote && (
        <blockquote className="mt-2 border-l-2 border-primary/30 pl-3 text-[11.5px] italic text-muted-foreground">
          &ldquo;{item.source_quote}&rdquo;
        </blockquote>
      )}
      {item.coder_notes && (
        <p className="mt-2 rounded-md bg-muted/40 p-2 text-[11.5px] text-muted-foreground">
          <strong className="font-medium">Notes:</strong> {item.coder_notes}
        </p>
      )}
    </div>
  );
}

function Chip({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "primary";
}) {
  return (
    <span
      className={
        variant === "primary"
          ? "rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary"
          : "rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
      }
    >
      {children}
    </span>
  );
}
