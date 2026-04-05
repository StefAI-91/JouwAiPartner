"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardCheck,
  FolderKanban,
  Calendar,
  Building2,
  Users,
  Menu,
} from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function SideMenu({ reviewCount }: { reviewCount?: number }) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/review", label: "Review", icon: ClipboardCheck, badge: reviewCount },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/meetings", label: "Meetings", icon: Calendar },
    { href: "/clients", label: "Clients", icon: Building2 },
    { href: "/people", label: "People", icon: Users },
  ];

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="shrink-0" />
        }
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>

      <SheetContent side="left" className="bg-sidebar p-0" showCloseButton={false}>
        <SheetHeader className="border-b border-sidebar-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <img
              src="https://gattprzzbpnyygzgzvxg.supabase.co/storage/v1/object/public/Public/images/679a9066567ec01242301e4d_jap_logo_zwart_gradient.svg"
              alt="Jouw AI Partner"
              className="h-6 w-auto"
            />
            <SheetTitle className="font-heading text-sm font-semibold text-primary">
              Knowledge Platform
            </SheetTitle>
          </div>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-3 py-4">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <SheetClose key={href} render={<Link href={href} />}>
                <div
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
