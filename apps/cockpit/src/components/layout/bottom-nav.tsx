"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavItems, isNavItemActive } from "@/lib/constants/navigation";

export function BottomNav({ reviewCount }: { reviewCount?: number }) {
  const pathname = usePathname();
  const badges: Record<string, number | undefined> = { reviewCount };

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-2 shadow-2xl backdrop-blur-xl border border-white/20">
        {primaryNavItems.map((item) => {
          const isActive = isNavItemActive(item.href, pathname);
          const Icon = item.icon;
          const badge = item.badgeKey ? (badges[item.badgeKey] ?? undefined) : undefined;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-col items-center gap-0.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] leading-none">{item.label}</span>
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
