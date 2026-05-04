"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { FocusProject } from "@repo/database/queries/projects";

interface CommandPaletteContextValue {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  focusProjects: FocusProject[];
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return ctx;
}

export function CommandPaletteProvider({
  focusProjects,
  children,
}: {
  focusProjects: FocusProject[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);

  // Global ⌘K / Ctrl+K shortcut. Skipped while typing in inputs/textareas
  // unless the user explicitly holds the modifier — the modifier check below
  // already gates that, but we still skip on contenteditable to avoid
  // hijacking rich-text editors.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== "k") return;
      const target = e.target;
      if (target instanceof HTMLElement && target.isContentEditable) return;
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<CommandPaletteContextValue>(
    () => ({ open, openPalette, closePalette, focusProjects }),
    [open, openPalette, closePalette, focusProjects],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export function CommandPaletteOpenState({
  children,
}: {
  children: (api: { open: boolean; setOpen: (v: boolean) => void }) => React.ReactNode;
}) {
  const { open, openPalette, closePalette } = useCommandPalette();
  return (
    <>
      {children({
        open,
        setOpen: (v) => (v ? openPalette() : closePalette()),
      })}
    </>
  );
}
