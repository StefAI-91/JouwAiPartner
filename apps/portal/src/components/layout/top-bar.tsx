import { LogOut } from "lucide-react";
import Form from "next/form";
import { signOut } from "@/actions/auth";

interface TopBarProps {
  email: string | null;
}

export function TopBar({ email }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div />
      <div className="flex items-center gap-3">
        {email && <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>}
        <Form action={signOut}>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <LogOut className="size-4" />
            Uitloggen
          </button>
        </Form>
      </div>
    </header>
  );
}
