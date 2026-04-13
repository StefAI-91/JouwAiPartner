"use client";

import { useTransition } from "react";
import { LogOut, User as UserIcon } from "lucide-react";

import { cn } from "./utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export interface UserMenuProps {
  /** E-mailadres van de ingelogde gebruiker. Valt terug op een placeholder. */
  email?: string | null;
  /** Optionele volledige naam. Wordt gebruikt voor de avatar-initialen. */
  fullName?: string | null;
  /** Server Action die de sessie beëindigt en doorstuurt naar `/login`. */
  onSignOut: () => Promise<void>;
  /** Styling-variant: `sidebar` (desktop, witte sidebar) of `dark` (mobiel/donkere sidebar). */
  variant?: "sidebar" | "dark";
  className?: string;
}

function getInitials(email: string | null | undefined, fullName?: string | null): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (first + last).toUpperCase() || "?";
  }
  if (email) return email[0]?.toUpperCase() ?? "?";
  return "?";
}

/**
 * Gebruikersmenu onderaan de sidebar. Toont e-mail + een uitlog-optie.
 *
 * `onSignOut` moet een Server Action zijn (bv. `signOutAction` uit
 * `@repo/auth/actions`) zodat de Supabase-cookies server-side gewist worden.
 */
export function UserMenu({
  email,
  fullName,
  onSignOut,
  variant = "sidebar",
  className,
}: UserMenuProps) {
  const [isPending, startTransition] = useTransition();
  const initials = getInitials(email, fullName);
  const displayName = fullName?.trim() || email || "Onbekende gebruiker";

  const isDark = variant === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "group/user-menu flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-colors disabled:opacity-60",
          isDark
            ? "hover:bg-sidebar-accent/60 focus-visible:bg-sidebar-accent/60"
            : "hover:bg-muted/60 focus-visible:bg-muted/60",
          className,
        )}
        disabled={isPending}
        aria-label="Gebruikersmenu openen"
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold uppercase",
            isDark ? "bg-sidebar-accent text-sidebar-foreground" : "bg-primary/10 text-primary",
          )}
          aria-hidden="true"
        >
          {initials}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "truncate text-sm font-medium",
              isDark ? "text-sidebar-foreground" : "text-foreground",
            )}
          >
            {displayName}
          </span>
          {fullName && email && (
            <span
              className={cn(
                "truncate text-[11px]",
                isDark ? "text-sidebar-foreground/60" : "text-muted-foreground",
              )}
            >
              {email}
            </span>
          )}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={6}
        className="w-56 border border-border bg-background p-1 shadow-lg dark:bg-card"
      >
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5">
          <UserIcon className="size-4 text-muted-foreground" />
          <span className="truncate">{email ?? "Onbekend"}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          onClick={() => startTransition(() => onSignOut())}
        >
          <LogOut className="size-4" />
          <span>{isPending ? "Uitloggen…" : "Uitloggen"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
