export const dynamic = "force-dynamic";

import Link from "next/link";
import { Users, Crown, CalendarDays, Lock } from "lucide-react";
import { createClient } from "@repo/database/supabase/server";
import { countNeeds } from "@repo/database/queries/needs";

interface IntelCard {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  comingSoon?: boolean;
}

export default async function IntelligencePage() {
  const supabase = await createClient();
  const needsCount = await countNeeds(supabase);

  const cards: IntelCard[] = [
    {
      href: "/intelligence/team",
      label: "Team",
      description: "Behoeftes uit team meetings",
      icon: Users,
      badge: needsCount,
    },
    {
      href: "/intelligence/management",
      label: "Management",
      description: "Bestuurlijke overleggen",
      icon: Crown,
    },
    {
      href: "/intelligence/weekly",
      label: "Weekly",
      description: "Management dashboard",
      icon: CalendarDays,
    },
  ];

  return (
    <div className="px-4 pb-32 pt-6 lg:px-10">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight">Intelligence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-analyses vanuit verschillende perspectieven op jullie meetings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isDisabled = card.comingSoon;

          const content = (
            <div
              className={`group relative flex flex-col items-center gap-3 rounded-2xl border bg-white p-8 text-center shadow-sm transition-all ${
                isDisabled
                  ? "cursor-not-allowed border-muted/40 opacity-60"
                  : "border-border/50 hover:border-primary/20 hover:shadow-md"
              }`}
            >
              {card.comingSoon && (
                <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Soon
                </div>
              )}

              {card.badge !== undefined && card.badge > 0 && (
                <div className="absolute top-3 left-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                  {card.badge}
                </div>
              )}

              <div
                className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
                  isDisabled
                    ? "bg-muted/50 text-muted-foreground"
                    : "bg-primary/5 text-primary group-hover:bg-primary/10"
                }`}
              >
                <Icon className="h-7 w-7" />
              </div>

              <div>
                <h2 className="text-lg font-semibold">{card.label}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
              </div>
            </div>
          );

          if (isDisabled) {
            return <div key={card.href}>{content}</div>;
          }

          return (
            <Link key={card.href} href={card.href}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
