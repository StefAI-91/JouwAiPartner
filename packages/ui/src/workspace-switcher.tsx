"use client";

import { ChevronsUpDown, Check } from "lucide-react";

import { cn } from "./utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "./dropdown-menu";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { getWorkspaces, type WorkspaceId, type Workspace } from "./workspaces";

interface WorkspaceSwitcherProps {
  /** De workspace waar de gebruiker zich nu in bevindt. */
  current: WorkspaceId;
  /** Extra classes voor de trigger-knop. */
  className?: string;
  /**
   * Aanroep-context — op mobiel willen we geen extra border/achtergrond in
   * een reeds gestylde header; op desktop in de sidebar wél.
   */
  variant?: "sidebar" | "bare";
}

function WorkspaceRow({ workspace, isCurrent }: { workspace: Workspace; isCurrent: boolean }) {
  const Icon = workspace.icon;
  return (
    <div className="flex w-full items-center gap-2.5">
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-md",
          isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-sm font-medium text-foreground">{workspace.label}</span>
        <span className="truncate text-[11px] text-muted-foreground">{workspace.description}</span>
      </div>
      {isCurrent && <Check className="size-4 text-primary" />}
      {workspace.status === "coming_soon" && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Binnenkort
        </span>
      )}
    </div>
  );
}

/**
 * Workspace-switcher linksboven in de sidebar. Toont de huidige workspace en
 * laat de gebruiker naar een andere app (cockpit/devhub/portal) springen.
 *
 * Dit is een cross-origin navigatie — elke workspace draait als aparte
 * Next.js app, dus we gebruiken bewust `<a href>` met `rel="noopener"` in
 * plaats van `next/link`.
 */
export function WorkspaceSwitcher({
  current,
  className,
  variant = "sidebar",
}: WorkspaceSwitcherProps) {
  const workspaces = getWorkspaces();
  const currentWorkspace = workspaces.find((w) => w.id === current) ?? workspaces[0];
  const CurrentIcon = currentWorkspace.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group/switcher flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none transition-colors",
          variant === "sidebar"
            ? "hover:bg-muted/60 focus-visible:bg-muted/60"
            : "hover:bg-sidebar-accent/60 focus-visible:bg-sidebar-accent/60",
          className,
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CurrentIcon className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </span>
          <span className="truncate text-sm font-semibold text-foreground">
            {currentWorkspace.label}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={6} className="w-64 p-1.5">
        <div className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workspaces
        </div>

        {workspaces.map((workspace) => {
          const isCurrent = workspace.id === current;
          const isDisabled = workspace.status === "coming_soon" || (!workspace.url && !isCurrent);

          const commonClasses = cn(
            "flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 outline-none transition-colors",
            "focus:bg-accent",
            isDisabled && "cursor-not-allowed opacity-60 focus:bg-transparent",
            isCurrent && "bg-muted/50",
          );

          // Huidige workspace of nog niet beschikbaar: niet-navigerend item.
          // Andere workspaces: cross-origin anchor (aparte Next.js apps).
          return (
            <MenuPrimitive.Item
              key={workspace.id}
              disabled={isDisabled || isCurrent}
              className={commonClasses}
              render={
                isCurrent || isDisabled ? (
                  <div />
                ) : (
                  // Bewust geen target="_blank": in dezelfde tab switchen,
                  // anders krijg je dubbele sessies per workspace.
                  <a href={workspace.url} rel="noopener" />
                )
              }
            >
              <WorkspaceRow workspace={workspace} isCurrent={isCurrent} />
            </MenuPrimitive.Item>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
