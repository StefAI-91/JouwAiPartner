import Link from "next/link";
import { Home, MessageSquare, FolderKanban, Users, HelpCircle, Layers } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/meetings", label: "Meetings", icon: MessageSquare, disabled: true },
  { href: "/projects", label: "Projecten", icon: FolderKanban, disabled: true },
  { href: "/people", label: "Mensen", icon: Users, disabled: true },
  { href: "/architectuur", label: "Architectuur", icon: Layers },
  { href: "/help", label: "Help", icon: HelpCircle },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {/* App name */}
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <span className="font-heading text-sm font-semibold text-sidebar-primary">
            Knowledge Platform
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 p-3">
          {navItems.map(({ href, label, icon: Icon, disabled }) =>
            disabled ? (
              <span
                key={href}
                className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/40 transition-colors"
                aria-disabled="true"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </span>
            ) : (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ),
          )}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b border-border bg-background px-4 lg:hidden">
          <span className="font-heading text-sm font-semibold text-primary">
            Knowledge Platform
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
