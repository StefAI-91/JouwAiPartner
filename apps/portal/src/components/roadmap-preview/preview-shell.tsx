import type { ReactNode } from "react";

/**
 * Inner content shell. The outer chrome (sidebar, topbar, banner) leeft in
 * `apps/portal/src/app/design-preview/layout.tsx`. Deze shell verzorgt
 * alleen de leeswijdte en sectie-spacing.
 */
export function PreviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 py-12 md:px-12 md:py-16 space-y-32">
      {children}
    </div>
  );
}
