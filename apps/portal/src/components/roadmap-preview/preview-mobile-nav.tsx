"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarContent } from "./preview-sidebar";

/**
 * Mobile nav: hamburger-trigger + slide-in drawer met dezelfde inhoud
 * als de desktop-sidebar. Zichtbaar op <lg, verborgen op ≥lg.
 *
 * Gedrag: drawer sluit bij Escape, bij klikken op overlay, en bij
 * klikken op een nav-link.
 */
export function PreviewMobileNav() {
  const [open, setOpen] = useState(false);

  // Body scroll lock terwijl drawer open is
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Escape om te sluiten
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Trigger — alleen <lg */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-[var(--paper-elevated)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-white lg:hidden"
        style={{ borderColor: "var(--rule-hairline)" }}
      >
        <Menu className="size-4" />
      </button>

      {/* Drawer + overlay — alleen <lg */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          {/* Overlay */}
          <button
            type="button"
            aria-label="Sluit menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px] transition-opacity"
          />

          {/* Panel */}
          <div
            className="absolute inset-y-0 left-0 flex w-[82%] max-w-[320px] flex-col border-r shadow-2xl animate-in slide-in-from-left duration-200"
            style={{
              borderColor: "var(--rule-hairline)",
              backgroundColor: "var(--paper-deep)",
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Sluit menu"
              className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--paper-cream)] hover:text-[var(--ink)]"
            >
              <X className="size-4" />
            </button>

            <SidebarContent onLinkClick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
