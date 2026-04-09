import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProjectSwitcher } from "./project-switcher";

interface Project {
  id: string;
  name: string;
}

export function TopBar({
  projects,
  mobileSidebar,
}: {
  projects: Project[];
  mobileSidebar?: React.ReactNode;
}) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        {mobileSidebar}
        <ProjectSwitcher projects={projects} />
      </div>

      <Link href="/issues/new" className={buttonVariants({ size: "sm" })}>
        <Plus className="size-4" />
        Nieuw issue
      </Link>
    </header>
  );
}
