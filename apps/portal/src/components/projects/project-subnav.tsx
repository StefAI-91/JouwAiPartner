"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui/utils";

interface ProjectSubnavProps {
  projectId: string;
}

export function ProjectSubnav({ projectId }: ProjectSubnavProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  const items = [
    { href: base, label: "Dashboard" },
    { href: `${base}/issues`, label: "Issues" },
    { href: `${base}/feedback`, label: "Feedback" },
  ];

  return (
    <nav className="flex items-center gap-1 border-b border-border">
      {items.map((item) => {
        const isActive = item.href === base ? pathname === base : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
