"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@repo/ui/utils";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
}

export function PaginationControls({ currentPage, totalPages }: PaginationControlsProps) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function buildHref(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const qs = params.toString();
    return qs ? `/issues?${qs}` : "/issues";
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  // Show a window of page numbers around the current page
  const pageNumbers: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) {
    pageNumbers.push(i);
  }

  return (
    <nav className="flex items-center justify-center gap-1 py-4" aria-label="Pagination">
      <Link
        href={buildHref(currentPage - 1)}
        className={cn(
          "inline-flex items-center justify-center rounded-md size-8 text-sm transition-colors",
          hasPrev
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "pointer-events-none text-muted-foreground/30",
        )}
        aria-disabled={!hasPrev}
        tabIndex={hasPrev ? 0 : -1}
      >
        <ChevronLeft className="size-4" />
        <span className="sr-only">Vorige</span>
      </Link>

      {start > 1 && (
        <>
          <Link
            href={buildHref(1)}
            className="inline-flex items-center justify-center rounded-md size-8 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            1
          </Link>
          {start > 2 && (
            <span className="inline-flex items-center justify-center size-8 text-xs text-muted-foreground">
              ...
            </span>
          )}
        </>
      )}

      {pageNumbers.map((page) => (
        <Link
          key={page}
          href={buildHref(page)}
          className={cn(
            "inline-flex items-center justify-center rounded-md size-8 text-sm transition-colors",
            page === currentPage
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </Link>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="inline-flex items-center justify-center size-8 text-xs text-muted-foreground">
              ...
            </span>
          )}
          <Link
            href={buildHref(totalPages)}
            className="inline-flex items-center justify-center rounded-md size-8 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {totalPages}
          </Link>
        </>
      )}

      <Link
        href={buildHref(currentPage + 1)}
        className={cn(
          "inline-flex items-center justify-center rounded-md size-8 text-sm transition-colors",
          hasNext
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "pointer-events-none text-muted-foreground/30",
        )}
        aria-disabled={!hasNext}
        tabIndex={hasNext ? 0 : -1}
      >
        <ChevronRight className="size-4" />
        <span className="sr-only">Volgende</span>
      </Link>
    </nav>
  );
}
