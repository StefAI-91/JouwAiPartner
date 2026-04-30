import {
  BookOpen,
  CalendarClock,
  ChevronDown,
  FileText,
  Inbox,
  LifeBuoy,
  ListChecks,
  MapPin,
  MessageCircle,
} from "lucide-react";

interface SidebarItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  badge?: number;
}

export function PreviewSidebar() {
  const primary: SidebarItem[] = [
    { label: "Briefing", icon: BookOpen, active: true },
    { label: "Issues", icon: Inbox, badge: 12 },
    { label: "Roadmap", icon: MapPin },
    { label: "Feedback geven", icon: MessageCircle },
  ];
  const reports: SidebarItem[] = [
    { label: "SLA & rapporten", icon: ListChecks },
    { label: "Wekelijkse update", icon: CalendarClock },
  ];
  const docs: SidebarItem[] = [
    { label: "Contract", icon: FileText },
    { label: "SLA-document", icon: FileText },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/50 bg-white/60 backdrop-blur-sm lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-[13px] font-bold text-primary-foreground">
          JAP
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Jouw AI Partner</div>
          <div className="text-[11px] text-muted-foreground">Klantportaal</div>
        </div>
      </div>

      <div className="px-3 pb-2">
        <button className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm font-medium hover:bg-muted/40">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold">Connect-CRM</div>
            <div className="truncate text-[11px] text-muted-foreground">
              Stefan · Connectaal B.V.
            </div>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        <SidebarSection items={primary} />

        <SidebarHeader>Rapporten</SidebarHeader>
        <SidebarSection items={reports} small />

        <SidebarHeader>Documenten</SidebarHeader>
        <SidebarSection items={docs} small />

        <div className="mt-auto pt-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">
            <LifeBuoy className="size-4" />
            <span>Vraag aan team</span>
          </button>
        </div>
      </nav>

      <div className="border-t border-border/50 px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
            SS
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-medium">Stefan Smit</div>
            <div className="truncate text-[11px] text-muted-foreground">stefan@connectaal.nl</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SidebarHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
      {children}
    </div>
  );
}

function SidebarSection({ items, small }: { items: SidebarItem[]; small?: boolean }) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            className={`flex items-center gap-3 rounded-lg px-3 ${small ? "py-1.5" : "py-2"} text-left text-sm font-medium transition-colors ${
              item.active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Icon className={`${small ? "size-4" : "size-[17px]"} shrink-0`} />
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-foreground/10 px-1.5 text-[10px] font-bold text-foreground/70">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}
