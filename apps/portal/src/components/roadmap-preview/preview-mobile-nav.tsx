"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { SidebarContent } from "./preview-sidebar";

const subscribeNoop = () => () => {};
const getSnapshotClient = () => true;
const getSnapshotServer = () => false;

/**
 * Mobile nav: hamburger-trigger + slide-in drawer met dezelfde inhoud
 * als de desktop-sidebar. Zichtbaar op <lg, verborgen op ≥lg.
 *
 * De drawer wordt via createPortal naar document.body gerenderd om
 * containing-block-tricks van de topbar (backdrop-filter) te omzeilen.
 *
 * Gedrag: drawer sluit bij Escape, bij klikken op overlay, en bij
 * klikken op een nav-link.
 */
export function PreviewMobileNav() {
  const [open, setOpen] = useState(false);
  // Hydration-flag via useSyncExternalStore — voorkomt SSR mismatch
  // zonder setState in een effect (zie React 19 lint-rule).
  const mounted = useSyncExternalStore(subscribeNoop, getSnapshotClient, getSnapshotServer);

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

  const drawer = open ? (
    <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Sluit menu"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/40"
      />

      {/* Panel */}
      <div
        className="preview-editorial absolute inset-y-0 left-0 flex w-[82%] max-w-[320px] flex-col border-r shadow-2xl animate-in slide-in-from-left duration-200"
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
  ) : null;

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

      {/* Drawer wordt naar body geportaald zodat hij buiten de stacking
          context van de topbar (backdrop-filter) leeft. */}
      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
