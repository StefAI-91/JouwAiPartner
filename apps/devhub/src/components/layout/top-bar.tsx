import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProjectSwitcher } from "./project-switcher";

interface Project {
  id: string;
  name: string;
}

export function TopBar({ projects }: { projects: Project[] }) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-background px-4">
      <ProjectSwitcher projects={projects} />

      <Link href="/issues/new" className={buttonVariants({ size: "sm" })}>
        <Plus className="size-4" />
        Nieuw issue
      </Link>
    </header>
  );
}
