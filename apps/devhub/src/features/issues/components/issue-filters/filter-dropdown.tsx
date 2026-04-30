"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@repo/ui/utils";

interface FilterDropdownProps {
  label: string;
  paramKey: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (key: string, value: string) => void;
}

export function FilterDropdown({
  label,
  paramKey,
  options,
  selected,
  onToggle,
}: FilterDropdownProps) {
  const hasSelection = selected.length > 0;
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    }

    updatePosition();

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="flex-shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted",
          hasSelection && "border-primary/30 bg-primary/5 text-primary",
        )}
      >
        {label}
        {hasSelection && (
          <span className="ml-0.5 rounded bg-primary/10 px-1 text-[0.65rem] font-medium">
            {selected.length}
          </span>
        )}
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      {open &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-50 min-w-40 rounded-lg border border-border bg-popover py-1 shadow-lg"
          >
            {options.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={isSelected}
                  onClick={() => onToggle(paramKey, opt.value)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent",
                    isSelected && "font-medium text-primary",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-3.5 items-center justify-center rounded border",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {isSelected && (
                      <svg className="size-2.5" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
