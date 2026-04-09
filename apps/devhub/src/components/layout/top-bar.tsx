"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProjectSwitcher } from "./project-switcher";

export function TopBar() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-background px-4">
      <ProjectSwitcher />

      <Link href="/issues/new" className={buttonVariants({ size: "sm" })}>
        <Plus className="size-4" />
        Issue
      </Link>
    </header>
  );
}
