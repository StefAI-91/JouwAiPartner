"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Shield } from "lucide-react";

interface Tab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { href: "/architectuur", label: "Platform", icon: Layers },
  { href: "/architectuur/security", label: "Security", icon: Shield },
];

export default function ArchitectuurLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      {/* Tab navigation */}
      <nav className="mb-8 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/architectuur" ? pathname === "/architectuur" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
