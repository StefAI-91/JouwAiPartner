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
  CalendarDays,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function DesktopSidebar({ reviewCount }: { reviewCount?: number }) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/weekly", label: "Weekly", icon: CalendarDays },
    { href: "/review", label: "Review", icon: ClipboardCheck, badge: reviewCount },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/meetings", label: "Meetings", icon: Calendar },
    { href: "/clients", label: "Clients", icon: Building2 },
    { href: "/people", label: "People", icon: Users },
  ];

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

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
