"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  primaryNavItems,
  secondaryNavItems,
  isNavItemActive,
  type NavItem,
} from "@/lib/constants/navigation";

function MenuLink({
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
    <SheetClose render={<Link href={item.href} />}>
      <div
        className={`flex items-center gap-4 rounded-xl px-4 ${small ? "py-2.5" : "py-3.5"} ${small ? "text-sm" : "text-base"} font-medium transition-colors ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        }`}
      >
        <Icon className={`${small ? "h-5 w-5" : "h-6 w-6"} shrink-0`} />
        <span className="flex-1">{item.label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
    </SheetClose>
  );
}

export function SideMenu({ reviewCount }: { reviewCount?: number }) {
  const pathname = usePathname();
  const badges: Record<string, number | undefined> = { reviewCount };

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon-lg" className="shrink-0" />}>
        <Menu className="h-6 w-6" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>

      <SheetContent side="left" className="bg-sidebar p-0" showCloseButton={false}>
        <SheetHeader className="border-b border-sidebar-border px-6 py-5">
          <div className="flex items-center gap-3">
            <img
              src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
              alt="Jouw AI Partner"
              className="h-8 w-auto"
            />
            <SheetTitle className="font-heading text-base font-semibold text-primary">
              Knowledge Platform
            </SheetTitle>
          </div>
        </SheetHeader>

        <nav className="flex flex-col gap-1.5 px-4 py-5">
          {primaryNavItems.map((item) => (
            <MenuLink
              key={item.href}
              item={item}
              pathname={pathname}
              badge={item.badgeKey ? (badges[item.badgeKey] ?? undefined) : undefined}
            />
          ))}

          {/* Bronnen section */}
          <div className="mb-1 mt-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Bronnen
          </div>
          {secondaryNavItems.map((item) => (
            <MenuLink key={item.href} item={item} pathname={pathname} small />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
