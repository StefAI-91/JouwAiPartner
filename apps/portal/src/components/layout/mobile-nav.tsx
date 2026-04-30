"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { SidebarContent, type SidebarProject } from "./sidebar-content";

const subscribeNoop = () => () => {};
const getSnapshotClient = () => true;
const getSnapshotServer = () => false;

function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribeNoop, getSnapshotClient, getSnapshotServer);
}

interface MobileNavContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

function useMobileNav(): MobileNavContextValue {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("useMobileNav must be used inside <MobileNavProvider>");
  }
  return ctx;
}

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>
  );
}

export function MobileNavTrigger() {
  const { open, setOpen } = useMobileNav();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open menu"
      aria-expanded={open}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground/70 transition-colors hover:bg-muted hover:text-foreground lg:hidden"
    >
      <Menu className="size-4" />
    </button>
  );
}

interface MobileNavDrawerProps {
  projects: SidebarProject[];
}

export function MobileNavDrawer({ projects }: MobileNavDrawerProps) {
  const { open, setOpen } = useMobileNav();
  const isHydrated = useIsHydrated();

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!isHydrated || !open) return null;

  const drawer = (
    <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Sluit menu"
        onClick={close}
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
      />

      <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-[280px] flex-col border-r border-sidebar-border bg-sidebar shadow-2xl drawer-slide-in">
        <button
          type="button"
          onClick={close}
          aria-label="Sluit menu"
          className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <X className="size-4" />
        </button>

        <SidebarContent projects={projects} onNavigate={close} />
      </div>
    </div>
  );

  return createPortal(drawer, document.body);
}
