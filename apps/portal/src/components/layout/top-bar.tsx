import { LogOut } from "lucide-react";
import Form from "next/form";
import { signOut } from "@/actions/auth";
import { Breadcrumb } from "./breadcrumb";
import { MobileNavTrigger } from "./mobile-nav";

interface TopBarProps {
  email: string | null;
  projects: { id: string; name: string }[];
}

export function TopBar({ email, projects }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4">
      <div className="flex min-w-0 items-center gap-3">
        <MobileNavTrigger />
        <Breadcrumb projects={projects} />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {email && <span className="hidden text-sm text-muted-foreground md:inline">{email}</span>}
        <Form action={signOut}>
          <button
            type="submit"
            aria-label="Uitloggen"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-2 text-sm font-medium transition-colors hover:bg-muted sm:px-3"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Uitloggen</span>
          </button>
        </Form>
      </div>
    </header>
  );
}
