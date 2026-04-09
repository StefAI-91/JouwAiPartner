"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  primaryNavItems,
  secondaryNavItems,
  isNavItemActive,
  type NavItem,
} from "@/lib/constants/navigation";

function NavLink({
  item,
  pathname,
  badge,
  small,
}: {
  item: NavItem;
  pathname: string;
  badge?: number;
  small?: boolean;
}) {
  const isActive = isNavItemActive(item.href, pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 ${small ? "py-1.5" : "py-2"} text-sm font-medium transition-colors ${
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      <Icon className={`${small ? "h-4 w-4" : "h-4.5 w-4.5"} shrink-0`} />
      <span className="flex-1">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

export function DesktopSidebar({ reviewCount }: { reviewCount?: number }) {
  const pathname = usePathname();
  const badges: Record<string, number | undefined> = { reviewCount };

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border/50 bg-white/60 backdrop-blur-sm lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img
          src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
          alt="Jouw AI Partner"
          className="h-7 w-auto"
        />
        <span className="font-heading text-sm font-semibold text-primary">Knowledge Platform</span>
      </div>

      {/* Primary navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            badge={item.badgeKey ? (badges[item.badgeKey] ?? undefined) : undefined}
          />
        ))}

        {/* Bronnen section */}
        <div className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Bronnen
        </div>
        {secondaryNavItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} small />
        ))}
      </nav>
    </aside>
  );
}
