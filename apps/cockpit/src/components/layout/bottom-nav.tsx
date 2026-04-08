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
  BrainCircuit,
  Mail,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function BottomNav({ reviewCount }: { reviewCount?: number }) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/intelligence", label: "Intelligence", icon: BrainCircuit },
    { href: "/review", label: "Review", icon: ClipboardCheck, badge: reviewCount },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/meetings", label: "Meetings", icon: Calendar },
    { href: "/emails", label: "Emails", icon: Mail },
    { href: "/clients", label: "Clients", icon: Building2 },
    { href: "/people", label: "People", icon: Users },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-2 shadow-2xl backdrop-blur-xl border border-white/20">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-col items-center gap-0.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] leading-none">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
